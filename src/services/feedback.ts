import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Feedback } from '../types';

const MAX_MESSAGE_LENGTH = 2000;

export function validateFeedbackInput(
  screenName: string,
  message: string
): string | null {
  if (!screenName.trim()) return 'Select a screen';
  if (!message.trim()) return 'Message is required';
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return `Message must be ${MAX_MESSAGE_LENGTH} characters or less`;
  }
  return null;
}

export async function submitFeedback(input: {
  userId: string;
  userEmail: string;
  userName: string;
  screenName: string;
  message: string;
}): Promise<Feedback> {
  const error = validateFeedbackInput(input.screenName, input.message);
  if (error) throw new Error(error);

  const id = doc(collection(db, 'feedback')).id;
  const feedback: Feedback = {
    id,
    userId: input.userId,
    userEmail: input.userEmail.trim(),
    userName: input.userName.trim(),
    screenName: input.screenName.trim(),
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'feedback', id), feedback);
  return feedback;
}
