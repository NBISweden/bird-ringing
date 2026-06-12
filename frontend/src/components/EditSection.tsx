import { useTranslation } from "@/app/(system)/internationalization";
import Icon from "./Icon";

export function EditButton({
  isEditing,
  onChange,
}: {
  isEditing: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      className="btn btn-outline-secondary ms-2"
      onClick={() => onChange(!isEditing)}
    >
      <Icon icon={isEditing ? "eye" : "pencil-square"} />
      <span className="ms-2">{isEditing ? t("done") : t("edit")}</span>
    </button>
  );
}

export function EditSection({
  edit,
  setEdit,
  editView,
  displayView,
  isAccented,
  isFlat,
  ...props
}: {
  edit: boolean;
  setEdit: (e: boolean) => void;
  editView: () => React.ReactNode;
  displayView: () => React.ReactNode;
  isAccented?: boolean;
  isFlat?: boolean;
} & (
  | { title: string }
  | { editHeader: () => React.ReactNode; displayHeader: () => React.ReactNode }
)) {
  return (
    <div className={`card ${isAccented ? "border-primary" : ""}`}>
      <div className={isFlat ? "card-body" : "card-header"}>
        <div className="d-flex gap-4 justify-content-between align-items-center">
          {"title" in props ? (
            <h2 className="h3 card-title flex-grow-1 m-0">{props.title}</h2>
          ) : edit ? (
            props.editHeader()
          ) : (
            props.displayHeader()
          )}
          <EditButton isEditing={edit} onChange={() => setEdit(!edit)} />
        </div>
      </div>
      {edit ? editView() : displayView()}
    </div>
  );
}
