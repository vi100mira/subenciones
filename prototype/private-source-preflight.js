(function () {
  const MIN_FILES = 3; const MIN_BYTES = 100 * 1024; const EMPTY_BYTES = 4 * 1024;

  function summarizeFiles(input) {
    const files = [...(input?.files || [])];
    if (!files.length) return null;
    const supported = files.filter((file) => /\.(pdf|docx|xlsx|jpe?g|png)$/i.test(file.name));
    const relative = files[0].webkitRelativePath || files[0].name;
    return {
      rootName: relative.split("/")[0] || "Carpeta local",
      totalFiles: files.length,
      supportedFiles: supported.length,
      supportedBytes: supported.reduce((total, file) => total + Number(file.size || 0), 0)
    };
  }

  async function summarizeDirectoryHandle(handle) {
    let totalFiles = 0; let supportedFiles = 0; let supportedBytes = 0;
    async function visit(directory) {
      for await (const entry of directory.values()) {
        if (entry.kind === "directory") { await visit(entry); continue; }
        totalFiles += 1;
        if (!/\.(pdf|docx|xlsx|jpe?g|png)$/i.test(entry.name)) continue;
        const file = await entry.getFile();
        supportedFiles += 1;
        supportedBytes += Number(file.size || 0);
      }
    }
    await visit(handle);
    return { rootName: handle.name || "Carpeta local", totalFiles, supportedFiles, supportedBytes };
  }

  function assess(summary, acceptLimited = false) {
    if (!summary?.totalFiles) return { status: "blocked", reason: "La carpeta está vacía." };
    if (!summary.supportedFiles) return { status: "blocked", reason: "No contiene archivos PDF, DOCX o XLSX utilizables." };
    if (summary.supportedBytes < EMPTY_BYTES) return { status: "blocked", reason: "Los archivos compatibles están vacíos o tienen un tamaño insuficiente." };
    if (summary.supportedFiles < MIN_FILES || summary.supportedBytes < MIN_BYTES) {
      return { status: acceptLimited ? "ready_limited" : "review", reason: acceptLimited
        ? "Fuente pequeña aceptada expresamente." : "La carpeta parece poco sustancial; revísala antes de continuar." };
    }
    return { status: "ready", reason: "La carpeta supera la criba mínima." };
  }

  function manifest(summary) {
    return { totalFiles: summary.totalFiles, supportedFiles: summary.supportedFiles, supportedBytes: summary.supportedBytes };
  }

  window.PrivateSourcePreflight = { assess, manifest, summarizeDirectoryHandle, summarizeFiles };
})();
