import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, type User } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Google Drive scopes requested by the app
provider.addScope("https://www.googleapis.com/auth/drive");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/drive.readonly");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If there's a user but no cached token, they might have refreshed.
        // We'll require them to click Sign-In again or keep token in-memory.
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve access token from Google Sign-In.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

// List text files and Google Docs from Google Drive
export const listDriveFiles = async (accessToken: string): Promise<DriveFile[]> => {
  const query = encodeURIComponent(
    "(mimeType = 'text/plain' or mimeType = 'application/vnd.google-apps.document') and trashed = false"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=30`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list Google Drive files: ${response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
};

// Download a text file or export a Google Doc as plain text
export const downloadDriveFile = async (
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<string> => {
  let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  // If it's a Google Doc, we must export it to plain text
  if (mimeType === "application/vnd.google-apps.document") {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  return response.text();
};

// Upload a text file to Google Drive
export const uploadTextToDrive = async (
  accessToken: string,
  filename: string,
  content: string
): Promise<DriveFile> => {
  const boundary = "voxstudio_multipart_boundary";
  const metadata = {
    name: filename,
    mimeType: "text/plain",
  };

  const multipartBody = [
    `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`,
    `\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${content}`,
    `\r\n--${boundary}--`,
  ].join("");

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to upload text file to Google Drive: ${response.statusText}`);
  }

  return response.json();
};

// Helper to convert Blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract base64 portion of the data URL
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Upload synthesized speech audio to Google Drive
export const uploadAudioToDrive = async (
  accessToken: string,
  filename: string,
  audioBlob: Blob
): Promise<DriveFile> => {
  const base64Data = await blobToBase64(audioBlob);
  const boundary = "voxstudio_multipart_boundary";
  const metadata = {
    name: filename,
    mimeType: "audio/mp3",
  };

  // Construct multipart related body with base64 encoded audio
  const multipartBody = [
    `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`,
    `\r\n--${boundary}\r\nContent-Type: audio/mp3\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Data}`,
    `\r\n--${boundary}--`,
  ].join("");

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to upload audio to Google Drive: ${response.statusText}`);
  }

  return response.json();
};
