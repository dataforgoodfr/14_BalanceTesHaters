export async function fetchUrlContentAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) return url;
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
