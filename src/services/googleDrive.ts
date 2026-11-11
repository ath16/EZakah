import { DriveFileItem } from '../types/zakat';

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

/**
 * Finds a folder by name (optionally inside a parent folder), or creates it if it does not exist.
 */
export async function ensureDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const escapedName = folderName.replace(/'/g, "\\'");
  let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`;
  if (parentFolderId) {
    q += ` and '${parentFolderId}' in parents`;
  }

  const searchUrl = `${DRIVE_FILES_API}?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,webViewLink)&pageSize=5`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
  }

  // Create folder if not found
  const metadata: {
    name: string;
    mimeType: string;
    parents?: string[];
  } = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const createRes = await fetch(`${DRIVE_FILES_API}?fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `Gagal membuat folder '${folderName}' di Google Drive.`
    );
  }

  return await createRes.json();
}

/**
 * Ensures the main 'UPZ' folder and both 'Bukti' and 'Rekapitulasi' subfolders inside 'UPZ' exist in the user's Google Drive.
 */
export async function ensureUpzAndBuktiFolders(
  accessToken: string,
  upzFolderName = 'UPZ'
): Promise<{
  upzFolderId: string;
  upzFolderLink: string;
  buktiFolderId: string;
  buktiFolderLink: string;
  rekapitulasiFolderId: string;
  rekapitulasiFolderLink: string;
}> {
  const upzFolder = await ensureDriveFolder(accessToken, upzFolderName || 'UPZ');
  const [buktiFolder, rekapitulasiFolder] = await Promise.all([
    ensureDriveFolder(accessToken, 'Bukti', upzFolder.id),
    ensureDriveFolder(accessToken, 'Rekapitulasi', upzFolder.id),
  ]);

  return {
    upzFolderId: upzFolder.id,
    upzFolderLink:
      upzFolder.webViewLink || `https://drive.google.com/drive/folders/${upzFolder.id}`,
    buktiFolderId: buktiFolder.id,
    buktiFolderLink:
      buktiFolder.webViewLink || `https://drive.google.com/drive/folders/${buktiFolder.id}`,
    rekapitulasiFolderId: rekapitulasiFolder.id,
    rekapitulasiFolderLink:
      rekapitulasiFolder.webViewLink ||
      `https://drive.google.com/drive/folders/${rekapitulasiFolder.id}`,
  };
}

/**
 * Lists Google Spreadsheets from the user's Google Drive (both inside the UPZ folder and general Drive).
 */
export async function listDriveSpreadsheets(
  accessToken: string,
  upzFolderId?: string
): Promise<{
  upzFiles: DriveFileItem[];
  allSpreadsheets: DriveFileItem[];
}> {
  const allQuery = `mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const allRes = await fetch(
    `${DRIVE_FILES_API}?q=${encodeURIComponent(
      allQuery
    )}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&orderBy=modifiedTime desc&pageSize=25`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  let allSpreadsheets: DriveFileItem[] = [];
  if (allRes.ok) {
    const data = await allRes.json();
    allSpreadsheets = data.files || [];
  }

  let upzFiles: DriveFileItem[] = [];
  if (upzFolderId) {
    const upzQuery = `mimeType = 'application/vnd.google-apps.spreadsheet' and '${upzFolderId}' in parents and trashed = false`;
    const upzRes = await fetch(
      `${DRIVE_FILES_API}?q=${encodeURIComponent(
        upzQuery
      )}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&orderBy=modifiedTime desc&pageSize=25`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (upzRes.ok) {
      const data = await upzRes.json();
      upzFiles = data.files || [];
    }
  }

  return { upzFiles, allSpreadsheets };
}

/**
 * Moves a Google Spreadsheet into the target UPZ Drive folder so it stays organized.
 */
export async function moveFileToDriveFolder(
  accessToken: string,
  fileId: string,
  targetFolderId: string
): Promise<void> {
  // Get current parents
  const getRes = await fetch(`${DRIVE_FILES_API}/${fileId}?fields=parents`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  let removeParentsParam = '';
  if (getRes.ok) {
    const fileMeta = await getRes.json();
    if (Array.isArray(fileMeta.parents) && fileMeta.parents.length > 0) {
      removeParentsParam = `&removeParents=${fileMeta.parents.join(',')}`;
    }
  }

  await fetch(
    `${DRIVE_FILES_API}/${fileId}?addParents=${targetFolderId}${removeParentsParam}&fields=id,parents`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

/**
 * Uploads a QRIS/Transfer screenshot or photo directly into the 'Bukti' folder inside 'UPZ' on the user's Google Drive.
 */
export async function uploadBuktiToDrive(
  accessToken: string,
  file: File,
  muzakkiName: string,
  tanggal: string,
  upzFolderName = 'UPZ'
): Promise<{
  fileId: string;
  fileName: string;
  webViewLink: string;
  upzFolderId: string;
  buktiFolderId: string;
}> {
  const { upzFolderId, buktiFolderId } = await ensureUpzAndBuktiFolders(
    accessToken,
    upzFolderName
  );

  const safeName = muzakkiName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = file.name.split('.').pop() || 'jpg';
  const uploadedFileName = `Bukti_QRIS_TF_${tanggal}_${safeName}_${Date.now()
    .toString()
    .slice(-4)}.${ext}`;

  const metadata = {
    name: uploadedFileName,
    parents: [buktiFolderId],
    description: `Bukti Pembayaran Zakat QRIS/Transfer atas nama ${muzakkiName} (${tanggal})`,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || 'Gagal mengunggah foto bukti ke folder UPZ/Bukti di Google Drive.'
    );
  }

  const uploaded = await uploadRes.json();
  return {
    fileId: uploaded.id,
    fileName: uploaded.name || uploadedFileName,
    webViewLink:
      uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
    upzFolderId,
    buktiFolderId,
  };
}

/**
 * Uploads a generated PDF document directly into the 'Rekapitulasi' folder inside 'UPZ' on the user's Google Drive.
 */
export async function uploadRekapPdfToDrive(
  accessToken: string,
  pdfBlob: Blob,
  fileName: string,
  upzFolderName = 'UPZ'
): Promise<{
  fileId: string;
  fileName: string;
  webViewLink: string;
  upzFolderId: string;
  rekapitulasiFolderId: string;
  rekapitulasiFolderLink: string;
}> {
  const { upzFolderId, rekapitulasiFolderId, rekapitulasiFolderLink } =
    await ensureUpzAndBuktiFolders(accessToken, upzFolderName);

  const metadata = {
    name: fileName,
    mimeType: 'application/pdf',
    parents: [rekapitulasiFolderId],
    description: `Laporan Rekapitulasi Total Penerimaan & Penyaluran Zakat (${fileName})`,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append(
    'file',
    new Blob([pdfBlob], { type: 'application/pdf' }),
    fileName
  );

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(
      err?.error?.message ||
        'Gagal menyimpan file PDF ke folder UPZ/Rekapitulasi di Google Drive.'
    );
  }

  const uploaded = await uploadRes.json();
  return {
    fileId: uploaded.id,
    fileName: uploaded.name || fileName,
    webViewLink:
      uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
    upzFolderId,
    rekapitulasiFolderId,
    rekapitulasiFolderLink,
  };
}
