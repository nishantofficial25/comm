export const formatFileSize = (sizeInKB: number) => {
  if (sizeInKB >= 1000) {
    const mb = sizeInKB / 1000;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(2)} MB`;
  }
  return `${sizeInKB} KB`;
};
