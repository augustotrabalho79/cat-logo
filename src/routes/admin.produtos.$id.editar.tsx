import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/produtos/$id/editar")({
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  return <ProductForm productId={id} />;
}
