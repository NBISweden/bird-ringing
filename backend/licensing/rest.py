from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.reverse import reverse

from licensing.license_card_service import LicenseCardService, NoCurrentLicense, ActorNotOnLicense
from licensing.message_builder import MessageBuilder, LicenseAndPermitMessageBuilder
from licensing.communication_service import CommunicationService
from licensing.utils import get_flattened_license_and_relations
from django.core import mail

from licensing.models import (
    LicensePermissionProperty,
    LicenseSequence,
    License,
    Actor,
    ActorTypeChoices,
    SexChoices,
    LanguageChoices,
    LicenseRoleChoices,
    LicenseRelation,
    ReportStatusChoices,
    LicensePermission,
    LicensePermissionType,
    LicenseStatusChoices,
    LicenseDocument,
    LicenseCommunication,
    CommunicationTypeChoices,
)
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from rest_framework.permissions import DjangoModelPermissions

from rest_framework import routers, serializers, viewsets, filters, pagination, response
from django.db import models
from django.http import HttpResponse
from django.template.exceptions import TemplateDoesNotExist
from django.contrib.postgres.aggregates import StringAgg
from collections import OrderedDict
from typing import Tuple
import logging


logger = logging.getLogger(__name__)


def parse_csv_string(csv_str: str):
    return [v.strip() for v in csv_str.split(",")]

def get_current_licenses(mnrs: list[str]) -> list[License]:
    if not mnrs:
        raise serializers.ValidationError({"mnrs": "mnrs is required (comma-separated)."})

    invalid_mnrs = [m for m in mnrs if not MnrSerializer(data={"mnr": m}).is_valid()]
    if invalid_mnrs:
        raise serializers.ValidationError(
            {"mnrs": f"Invalid mnr(s): {', '.join(invalid_mnrs)}. Expected 4 digits each."}
        )

    seqs_by_mnr = {s.mnr: s for s in LicenseSequence.objects.filter(mnr__in=mnrs)}
    missing_mnrs = [m for m in mnrs if m not in seqs_by_mnr]
    if missing_mnrs:
        raise serializers.ValidationError({"mnrs": f"Unknown mnr(s): {', '.join(missing_mnrs)}"})

    sequences = [seqs_by_mnr[m] for m in mnrs]
    licenses = []
    for seq in sequences:
        lic = seq.current
        if not lic:
            raise serializers.ValidationError({"mnrs": f"No current license for mnr {seq.mnr}."})
        licenses.append(lic)

    return licenses


class DjangoProtectedModelPermissions(DjangoModelPermissions):
    perms_map = {
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": [],
        "HEAD": [],
        "POST": ["%(app_label)s.add_%(model_name)s"],
        "PUT": ["%(app_label)s.change_%(model_name)s"],
        "PATCH": ["%(app_label)s.change_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }


class IdSelectionFilter(filters.BaseFilterBackend):
    """
    Filter that allows filtering on object ids
    """

    def filter_queryset(self, request, queryset, view):
        id_filter_target = getattr(view, "id_filter_target", "id")
        id_filter_max = getattr(view, "id_filter_max", 100)

        filter_ids = set(
            [id for id in parse_csv_string(request.GET.get("ids", "")) if id]
        )

        if len(filter_ids) > id_filter_max:
            raise serializers.ValidationError(
                {
                    "ids": f"Too many ids in list {len(filter_ids)}. Maximum limit is {id_filter_max}"
                }
            )

        if len(filter_ids) > 0:
            filter = {f"{id_filter_target}__in": filter_ids}
            return queryset.filter(**filter)
        else:
            return queryset


class DynamicOrderingFilter(filters.BaseFilterBackend):
    """
    Filter that allows dynamic user controlled ordering
    """

    def filter_queryset(self, request, queryset, view):
        default_ordering = getattr(view, "default_ordering", [])
        base_allowed_ordering = getattr(view, "allowed_ordering", [])
        allowed_ordering = set(base_allowed_ordering)
        order_by = [
            o
            for o in parse_csv_string(request.GET.get("ordering", ""))
            if o in allowed_ordering
        ]
        order_by = order_by if len(order_by) > 0 else default_ordering
        return queryset.order_by(*order_by)

    @staticmethod
    def include_reverse(items: list[str]):
        return [f"{d}{o}" for o in items for d in ["", "-"]]


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000

    def get_paginated_response(self, data):
        return response.Response(
            OrderedDict(
                [
                    ("count", self.page.paginator.count),
                    (
                        "num_pages",
                        self.page.paginator.num_pages,
                    ),  # Add total number of pages
                    ("next", self.get_next_link()),
                    ("previous", self.get_previous_link()),
                    ("results", data),
                ]
            )
        )


class ActorLicenseRelationSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=LicenseRoleChoices, source="get_role_display"
    )
    version = serializers.IntegerField(source="license.version", read_only=True)
    starts_at = serializers.DateField(source="license.starts_at", read_only=True)
    ends_at = serializers.DateField(source="license.ends_at", read_only=True)
    communication_status = serializers.SerializerMethodField(read_only=True)
    communication_type = serializers.SerializerMethodField(read_only=True)


    class Meta:
        model = LicenseRelation
        fields = ["license_id", "role", "mnr", "mednr", "version", "starts_at", "ends_at", "communication_status", "communication_type"]

    def get_communication_status(self, obj):  
        license_communication = LicenseCommunication.objects.filter(license=obj.license, actor=obj.actor).last()
        if license_communication:
            return license_communication.get_status_display()
        return None
    
    def get_communication_type(self, obj):
        license_communication = LicenseCommunication.objects.filter(license=obj.license, actor=obj.actor).last()
        if license_communication:
            return license_communication.get_type_display()
        return None



class ActorSerializer(serializers.ModelSerializer):
    type = serializers.ChoiceField(choices=ActorTypeChoices, source="get_type_display")
    sex = serializers.ChoiceField(choices=SexChoices, source="get_sex_display")
    language = serializers.ChoiceField(
        choices=LanguageChoices, source="get_language_display"
    )
    current_license_relations = ActorLicenseRelationSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = Actor
        fields = [
            "id",
            "full_name",
            "first_name",
            "last_name",
            "type",
            "sex",
            "birth_date",
            "language",
            "phone_number1",
            "phone_number2",
            "email",
            "alternative_email",
            "address",
            "co_address",
            "postal_code",
            "city",
            "country",
            "current_license_relations",
            "updated_at",
        ]


class LicenseActorSerializer(serializers.ModelSerializer):
    type = serializers.ChoiceField(choices=ActorTypeChoices, source="get_type_display")
    sex = serializers.ChoiceField(choices=SexChoices, source="get_sex_display")
    language = serializers.ChoiceField(
        choices=LanguageChoices, source="get_language_display"
    )

    class Meta:
        model = Actor
        fields = [
            "id",
            "full_name",
            "first_name",
            "last_name",
            "type",
            "sex",
            "birth_date",
            "language",
            "phone_number1",
            "phone_number2",
            "email",
            "alternative_email",
            "address",
            "co_address",
            "postal_code",
            "city",
            "country",
        ]


class LicenseActorRelationSerializer(serializers.ModelSerializer):
    actor = LicenseActorSerializer()
    role = serializers.ChoiceField(
        choices=LicenseRoleChoices, source="get_role_display"
    )

    class Meta:
        model = LicenseRelation
        fields = ["actor", "role", "mednr"]


class LicensePermissionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LicensePermissionType
        fields = ['name', 'description']

class LicensePermissionPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = LicensePermissionProperty
        fields = ["name", "description"]

class LicenseLicensePermissionSerializer(serializers.ModelSerializer):
    type = LicensePermissionTypeSerializer(read_only=True)
    species = serializers.SerializerMethodField()
    properties = LicensePermissionPropertySerializer(many=True, read_only=True)

    class Meta:
        model = LicensePermission
        fields = ["type", "description", "location", "starts_at", "ends_at", "species", "properties"]

    def get_species(self, obj):
        return list(obj.species_list.values_list('name', flat=True))

class LicenseDocumentSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source="actor.full_name", read_only=True)
    type = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = LicenseDocument
        fields = ["actor", "type", "reference"]

class LicenseCommunicationSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source="actor.full_name", read_only=True)
    type = serializers.CharField(source="get_type_display", read_only=True)
    status = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = LicenseCommunication
        fields = ["actor", "type", "status", "note"]


class LicenseSerializer(serializers.ModelSerializer):
    actors = LicenseActorRelationSerializer(many=True, read_only=True)
    permissions = LicenseLicensePermissionSerializer(many=True, read_only=True)
    documents = LicenseDocumentSerializer(many=True, read_only=True)
    communication = LicenseCommunicationSerializer(many=True, read_only=True)
    report_status = serializers.ChoiceField(
        choices=ReportStatusChoices, source="get_report_status_display"
    )

    class Meta:
        model = License
        fields = ["actors", "permissions", "documents", "communication", "version", "location", "description",
                  "report_status", "starts_at", "ends_at", "created_at", "updated_at"]


class LicenseHistoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = ["version", "starts_at", "ends_at"]


class LicenseSequenceSerializer(serializers.HyperlinkedModelSerializer):
    current = LicenseSerializer(read_only=True)
    history = serializers.SerializerMethodField()
    license_holder = serializers.CharField(read_only=True)
    license_holder_type = serializers.CharField(read_only=True)
    helper_count = serializers.IntegerField(read_only=True)
    status = serializers.ChoiceField(
        choices=LicenseStatusChoices, source="get_status_display"
    )
    methods = serializers.CharField()
    last_email_sent_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = LicenseSequence
        fields = [
            "mnr",
            "current",
            "history",
            "status",
            "license_holder",
            "license_holder_type",
            "helper_count",
            "methods",
            "last_email_sent_at",
        ]

    def get_history(self, obj):
        qs = obj.instances.exclude(version=0).order_by("-version")
        return LicenseHistoryItemSerializer(qs, many=True).data


license_status_label = models.Case(
    *[
        models.When(status=value, then=models.Value(label))
        for value, label in LicenseStatusChoices.choices
    ],
    output_field=models.CharField(),
    default=models.Value(""),
)

license_report_status_label = models.Case(
    *[
        models.When(instances__report_status=value, then=models.Value(label))
        for value, label in ReportStatusChoices.choices
    ],
    output_field=models.CharField(),
    default=models.Value(""),
)

class LicenseCardRenderSerializer(serializers.Serializer):
    actor_id = serializers.IntegerField(required=True, min_value=1)

class MnrSerializer(serializers.Serializer):
    mnr = serializers.CharField(min_length=4, max_length=4)

class LicenseSequenceViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    lookup_field = "mnr"
    queryset = LicenseSequence.objects.all().distinct()
    serializer_class = LicenseSequenceSerializer
    pagination_class = StandardResultsSetPagination

    filter_backends = [DynamicOrderingFilter]

    allowed_ordering = DynamicOrderingFilter.include_reverse(
        [
            "mnr",
            "status",
            "license_holder",
            "license_holder_type",
            "helper_count",
            "methods",
            "last_email_sent_at",
            "status_label",
            "report_status_label",
        ]
    )
    default_ordering = ["mnr"]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get("search", None)

        queryset = queryset.annotate(
            license_holder=StringAgg(
                models.Case(
                    models.When(
                        instances__actors__role=models.Value(LicenseRoleChoices.RINGER),
                        then="instances__actors__actor__full_name",
                    ),
                    default=models.Value(None),
                    output_field=models.CharField(),
                ),
                delimiter=", ",
                distinct=True,
            ),
            license_holder_type=models.Max(
                models.Case(
                    models.When(
                        instances__actors__role=models.Value(LicenseRoleChoices.RINGER),
                        then=models.Case(
                            *[
                                models.When(
                                    instances__actors__actor__type=value,
                                    then=models.Value(label),
                                )
                                for value, label in ActorTypeChoices.choices
                            ],
                            default=models.Value(""),
                            output_field=models.CharField(),
                        ),
                    ),
                    default=models.Value(None),
                    output_field=models.CharField(),
                )
            ),
            helper_count=models.Count(
                "instances__actors__actor",
                filter=models.Q(
                    instances__version=0,
                    instances__actors__role=LicenseRoleChoices.HELPER,
                ),
                distinct=True,
            ),
            methods=StringAgg(
                "instances__permissions__type__name", delimiter=", ", distinct=True
            ),
            last_email_sent_at=models.Max(
                models.Case(
                    models.When(
                        instances__communication__status=models.Value(1),
                        then="instances__communication__updated_at",
                    ),
                    default=models.Value(None),
                    output_field=models.DateField(),
                )
            ),
            status_label=license_status_label,
            report_status_label=license_report_status_label,
        )

        if search is not None:
            search_terms = search.split()
            for term in search_terms:
                queryset = queryset.filter(
                    models.Q(license_holder__icontains=term)
                    | models.Q(mnr__icontains=term)
                    | models.Q(methods__icontains=term)
                    | models.Q(last_email_sent_at__icontains=term)
                    | models.Q(status_label__icontains=term)
                    | models.Q(report_status_label__icontains=term)
                    | models.Q(license_holder_type__icontains=term)
                )

        return queryset

    @action(detail=True, methods=["put"], url_path="card-create")
    def card_create(self, request, mnr=None):
        seq = self.get_object()
        actor = self._get_actor_from_request(request)

        service = LicenseCardService()
        try:
            lic = seq.current
            if not lic:
                raise NoCurrentLicense("No current license found.")

            doc = service.get_or_create_license_card_document(
                lic=lic,
                actor=actor,
                created_by=request.user,
                updated_by=request.user,
            )
        except NoCurrentLicense as e:
            return Response({"detail": str(e)}, status=404)
        except ActorNotOnLicense as e:
            return Response({"detail": str(e)}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        pdf_url = reverse("licensesequence-card-pdf", kwargs={"mnr": seq.mnr}, request=request)
        pdf_url = f"{pdf_url}?actor_id={actor.id}"

        return Response({"filename": doc.reference, "pdf_url": pdf_url}, status=200)

    @action(detail=True, methods=["get"], url_path="card-pdf")
    def card_pdf(self, request, mnr=None):
        seq = self.get_object()
        actor = self._get_actor_from_request(request)

        service = LicenseCardService()
        try:
            lic = seq.current
            if not lic:
                raise NoCurrentLicense("No current license found.")

            doc = service.get_license_card_document(lic=lic, actor=actor)
        except NoCurrentLicense as e:
            return Response({"detail": str(e)}, status=404)
        except ActorNotOnLicense as e:
            return Response({"detail": str(e)}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        if not doc:
            return Response({"detail": "No current license card PDF exists. Call /card-create first."}, status=404)

        return self._pdf_http_response(lic=lic, actor=actor, doc=doc)

    def _get_actor_from_request(self, request) -> Actor:
        payload = request.data if request.method in ("POST", "PUT", "PATCH") else request.query_params
        # allow fallback if body is empty but query param exists
        if not payload or "actor_id" not in payload:
            payload = {"actor_id": request.query_params.get("actor_id")}

        ser = LicenseCardRenderSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        actor_id = ser.validated_data["actor_id"]

        try:
            return Actor.objects.get(pk=actor_id)
        except Actor.DoesNotExist:
            raise serializers.ValidationError({"actor_id": "Actor not found"})

    def _pdf_http_response(self, *, lic: License, actor: Actor, doc) -> HttpResponse:
        service = LicenseCardService()
        filename = doc.reference or service.make_license_card_filename(lic, actor)
        resp = HttpResponse(bytes(doc.data), content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp

    @action(detail=False, methods=["get"], url_path="card-pdf")
    def card_pdf_batch(self, request):
        raw = request.query_params.get("mnrs", "")
        mnrs = [m for m in parse_csv_string(raw) if m]

        try:
            licenses = get_current_licenses(mnrs)
        except serializers.ValidationError as e:
            return Response(e.detail, status=400)

        service = LicenseCardService()
        try:
            zip_bytes = service.create_zip_with_license_card_pdfs(
                licenses=licenses,
                allowed_roles=(LicenseRoleChoices.RINGER, LicenseRoleChoices.HELPER),
            )
        except NoCurrentLicense as e:
            return Response({"detail": str(e)}, status=404)
        except ActorNotOnLicense as e:
            return Response({"detail": str(e)}, status=400)
        except ValueError as e:
            return Response({"detail": str(e)}, status=404)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        resp = HttpResponse(zip_bytes, content_type="application/zip")
        resp["Content-Disposition"] = 'attachment; filename="license-cards.zip"'
        return resp

    @action(detail=False, methods=["put"], url_path="card-create")
    def card_create_batch(self, request):
        raw = request.query_params.get("mnrs", "")
        mnrs = [m for m in parse_csv_string(raw) if m]

        try:
            licenses = get_current_licenses(mnrs)
        except serializers.ValidationError as e:
            return Response(e.detail, status=400)

        service = LicenseCardService()
        try:
            docs = service.batch_get_or_create_license_card_documents(
                licenses=licenses,
                created_by=request.user,
                updated_by=request.user,
                allowed_roles=(LicenseRoleChoices.RINGER, LicenseRoleChoices.HELPER),
            )
        except NoCurrentLicense as e:
            return Response({"detail": str(e)}, status=404)
        except ActorNotOnLicense as e:
            return Response({"detail": str(e)}, status=400)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        return Response(
            {"filenames": [d.reference for d in docs]},
            status=200,
        )
    
    @action(detail=False, methods=["put"], url_path="send-license-emails")
    def send_license_emails(self, request):
        include_card = request.query_params.get("include_card") is not None
        include_permit = request.query_params.get("include_permit") is not None
        raw = request.query_params.get("mnrs", "")
        mnrs = [m for m in parse_csv_string(raw) if m]

        try:
            licenses = get_current_licenses(mnrs)
        except serializers.ValidationError as e:
            return Response(e.detail, status=400)

        message_builder = LicenseAndPermitMessageBuilder(
            MessageBuilder.from_licensing_settings(),
            LicenseCardService()
        )

        messages = []
        try:
            for (lic, relation) in get_flattened_license_and_relations(licenses):
                if not relation.actor.email: # Ignore sending if the actor has no email address declared
                    continue

                try:
                    message = message_builder.get_message(
                        lic,
                        relation,
                        include_card,
                        include_permit
                    )
                except ValueError as e:
                    return Response({"detail": str(e)}, status=400)
                messages.append((lic, relation.actor, message))
        except TemplateDoesNotExist as e:
            logger.error(f"send_license_emails: {type(e)}: {e}")
            return Response({"detail": "E-mail template is misconfigured."}, status=503)

        success_messages: dict[Tuple(bool, bool), str] = {
            (True, True): "E-mail with license and permit sent",
            (True, False): "E-mail with license sent",
            (False, True): "E-mail with permit sent",
        }
        try:
            communication_service = CommunicationService(mail)
            failed_messages = communication_service.send_email_messages(
                messages,
                CommunicationTypeChoices.LICENSE_DELIVERY,
                request.user,
                success_message=success_messages.get((include_card, include_permit), "E-mail sent")
            )
            return Response({
                "messages_sent": len(messages) - len(failed_messages),
                "messages_prepared": len(messages),
                "failed_messages": failed_messages,
            }, status=200 if len(failed_messages) == 0 else 422)

        except OSError as e:
            logger.error(f"send_license_emails: {type(e)}: {e}")
            return Response({"detail": "Failed to connect to mail server"}, status=503)

actor_type_label = models.Case(
    *[
        models.When(type=value, then=models.Value(label))
        for value, label in ActorTypeChoices.choices
    ],
    output_field=models.CharField(),
    default=models.Value(""),
)


license_role_label = models.Case(
    *[
        models.When(
            models.Q(licenses__role=value, licenses__license__version=0),
            then=models.Value(label),
        )
        for value, label in LicenseRoleChoices.choices
    ],
    output_field=models.CharField(),
    default=models.Value(""),
)

license_mnr = models.Case(
    models.When(
        models.Q(licenses__license__version=0),
        then=models.F("licenses__license__sequence__mnr"),
    ),
    output_field=models.CharField(),
    default=models.Value(""),
)


class ActorViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    queryset = Actor.objects.annotate(
        type_label=actor_type_label,
        license_role_label=StringAgg(
            license_role_label,
            delimiter=", ",
            distinct=True,
        ),
        license_mnr=StringAgg(
            license_mnr,
            delimiter=", ",
            distinct=True,
        ),
    ).all()
    serializer_class = ActorSerializer
    filter_backends = [filters.SearchFilter, DynamicOrderingFilter, IdSelectionFilter]
    search_fields = [
        "email",
        "alternative_email",
        "full_name",
        "first_name",
        "last_name",
        "city",
        "type_label",
        "license_role_label",
        "license_mnr",
    ]
    pagination_class = StandardResultsSetPagination

    allowed_ordering = DynamicOrderingFilter.include_reverse(
        [
            "full_name",
            "city",
            "country",
            "email",
            "alternative_email",
            "first_name",
            "last_name",
            "type",
            "updated_at",
        ]
    )
    default_ordering = ["full_name", "city", "country"]

router = routers.DefaultRouter()
router.register(r"license_sequence", LicenseSequenceViewSet)
router.register(r"actor", ActorViewSet)
