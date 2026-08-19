export function scrollToDashboardSection(
  sectionId: string,
  root: Pick<Document, "getElementById"> = document
) {
  const target = root.getElementById(sectionId);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}
