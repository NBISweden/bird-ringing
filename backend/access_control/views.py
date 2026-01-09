from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import BasicAuthentication
from .permissions import IsInGroup


class LoginView(APIView):
    authentication_classes = [BasicAuthentication]
    permission_classes = [IsAuthenticated, IsInGroup("EXPERTS")]

    def get(self, request):
        return Response({"username": request.user.username})
