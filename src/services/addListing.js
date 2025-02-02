import { db } from "../config/firebaseConfig.js"; // Firebase config
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import fs from "fs"; // File system module

export const uploadLocalFileToFirestore = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist at the given path.");
    }

    const fileBuffer = fs.readFileSync(filePath); // Read file from local storage
    const fileName = filePath.split("/").pop(); // Extract file name

    const fileRef = ref(db, `uploads/${fileName}`); // Firebase Storage path

    // Upload file to Firebase Storage
    const snapshot = await uploadBytes(fileRef, fileBuffer);
    const downloadURL = await getDownloadURL(snapshot.ref); // Get new image URL

    return { success: true, fileURL: downloadURL };
  } catch (error) {
    console.error("Error uploading file:", error);
    return { success: false, error: error.message };
  }
};
