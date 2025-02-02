import {
  collection,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig.js";

export const updateBearerName = async (id, bearerName) => {
  try {
    const userBearerRef = collection(db, "bearer");
    const querySnapshot = await getDocs(
      query(userBearerRef, where("id", "==", id))
    );

    if (querySnapshot.empty) {
      throw new Error("No document found with the given id.");
    }

    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, { bearerName });

    return { message: "Document updated successfully!" };
  } catch (error) {
    throw error;
  }
};
