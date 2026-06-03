export async function getParams<T>(
  context: { params: Promise<T> }
): Promise<T> {
  return context.params;
}