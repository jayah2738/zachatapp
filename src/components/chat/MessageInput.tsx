'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MessageInputProps {
  conversationId: string;
  disabled?: boolean;
  onMessageSent?: (sentMsg: any) => void | Promise<void>;
}

import { useSession } from 'next-auth/react';

export default function MessageInput({ conversationId, disabled = false, onMessageSent }: MessageInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  // Start recording
  const startRecording = async () => {
    if (!navigator.mediaDevices) return alert('Audio recording not supported');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new window.MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      setAudioBlob(new Blob(chunks, { type: 'audio/webm' }));
      setRecording(false);
      if (timerInterval) clearInterval(timerInterval);
    };
    setMediaRecorder(recorder);
    setRecording(true);
    setRecordingTime(0);
    setTimerInterval(setInterval(() => setRecordingTime((t) => t + 1), 1000));
    recorder.start();
  };

  // Stop recording
  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
    if (timerInterval) clearInterval(timerInterval);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setError(null);
    console.log('Submitting!', { message, attachment });
    e.preventDefault();
    if (!conversationId) {
      alert('Conversation ID is missing. Cannot send message.');
      return;
    }
    if (!session?.user?.id) {
      alert('You are not authenticated.');
      return;
    }
    if (!message.trim() && !attachment) return;

    try {
      let res;
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        formData.append('conversationId', conversationId);
        if (message.trim()) formData.append('text', message.trim());
        res = await fetch('/api/messages/file', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
      } else {
        res = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: message,
            conversationId,
          }),
        });
      }

      if (res.ok) {
        setMessage('');
        setAttachment(null);
        setAttachmentPreview(null);
        setRecordingTime(0);
        // Parse the sent message from the response
        let sentMsg;
        try {
          sentMsg = await res.json();
        } catch {
          sentMsg = null;
        }
        if (onMessageSent) await onMessageSent(sentMsg);
// Emit to socket server so receiver gets the message in real time
if (sentMsg && sentMsg.id && conversationId) {
  // (socket emit logic here if needed)
}

        // No need to refresh router, handled by parent
      } else {
        setError('Failed to send file. Please try again.');
        console.error('File send failed:', res.status, await res.text());
      }
    } catch (error) {
      setError('An unexpected error occurred.');
      console.error('Failed to send message:', error);
    }
  };

  if (recording || audioBlob) {
    return (
      <div className="flex flex-col items-center gap-2 bg-white rounded-xl shadow p-4 justify-center w-full">
        {recording && (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-full p-3 bg-red-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 "
          >
            <span className="flex items-center gap-1">
              <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg>
              Recording... {recordingTime}s
            </span>
          </button>
        )}
        {audioBlob && !recording && (
          <div className="flex items-center gap-2 w-full justify-center">
            <audio controls src={URL.createObjectURL(audioBlob)} className="h-10" />
            <button
              type="button"
              onClick={async () => {
                if (!conversationId || !audioBlob) return;
                try {
                  const formData = new FormData();
                  formData.append('audio', audioBlob, 'voicemail.webm');
                  formData.append('conversationId', conversationId);
                  const res = await fetch('/api/messages/audio', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                  });
                  if (res.ok) {
                    setAudioBlob(null);
                    setRecordingTime(0);
                    let sentMsg;
                    try {
                      sentMsg = await res.json();
                    } catch {
                      sentMsg = null;
                    }
                    if (onMessageSent) await onMessageSent(sentMsg);
                    // Emit to socket server so receiver gets the message in real time
                    if (sentMsg && sentMsg.id && conversationId) {
                      try {
                        const { getSocket } = await import('@/lib/socket');
                        const socket = getSocket();
                        socket.emit('send-message', { ...sentMsg, conversationId });
                      } catch (e) {
                        // Socket might not be available in SSR or import error
                        console.error('Socket emit failed:', e);
                      }
                    }
                  }
                } catch (error) {
                  console.error('Failed to send audio message:', error);
                }
              }}
              className="ml-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 "
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => setAudioBlob(null)}
              className="ml-2 text-red-500 hover:text-red-700 px-2 py-2 rounded-full focus:outline-none"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="text-red-500 text-xs mb-1">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Attachment Button */}
        <input
          id="file-input"
          type="file"
          style={{ display: 'none' }}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv,.mp3,.wav,.ogg"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            setAttachment(file);
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
              setAttachmentPreview(URL.createObjectURL(file));
            } else {
              setAttachmentPreview(null);
            }
          }}
        />
        <button
          type="button"
          className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none"
          onClick={() => document.getElementById('file-input')?.click()}
          disabled={recording || disabled || !!audioBlob || !!attachment}
          title="Attach file"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828a4 4 0 10-5.656-5.656l-8.486 8.486a6 6 0 108.486 8.486l7.07-7.071" />
          </svg>
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (audioBlob) setAudioBlob(null);
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-full border-0 px-6 py-3 bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner transition-shadow duration-200"
          disabled={recording || disabled || !!audioBlob || !!attachment}
        />
        {/* Attachment Preview */}
        {attachment && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            {attachmentPreview && attachment?.type?.startsWith('image/') && (
              <img src={attachmentPreview} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
            )}
            {attachmentPreview && attachment?.type?.startsWith('video/') && (
              <video src={attachmentPreview} controls className="w-20 h-16 rounded-lg" />
            )}
            {!attachmentPreview && (
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">{attachment?.name}</span>
                <span className="text-xs text-gray-500">{attachment?.type || 'File'}</span>
              </div>
            )}
            <button
              type="button"
              className="ml-2 text-red-500 hover:text-red-700 px-2 py-2 rounded-full focus:outline-none"
              onClick={() => {
                setAttachment(null);
                setAttachmentPreview(null);
              }}
              title="Remove"
            >
              ✕
            </button>
          </div>
        )}
        {audioBlob && !recording ? (
          <div className="flex items-center gap-2">
            <audio controls src={URL.createObjectURL(audioBlob)} className="h-10" />
            <button
              type="button"
              onClick={async () => {
                if (!conversationId || !audioBlob) return;
                try {
                  const formData = new FormData();
                  formData.append('audio', audioBlob, 'voicemail.webm');
                  formData.append('conversationId', conversationId);
                  const res = await fetch('/api/messages/audio', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                  });
                  if (res.ok) {
                    setAudioBlob(null);
                    setRecordingTime(0);
                    let sentMsg;
                    try {
                      sentMsg = await res.json();
                    } catch {
                      sentMsg = null;
                    }
                    if (onMessageSent) await onMessageSent(sentMsg);
                    // Emit to socket server so receiver gets the message in real time
                    if (sentMsg && sentMsg.id && conversationId) {
                      try {
                        const { getSocket } = await import('@/lib/socket');
                        const socket = getSocket();
                        socket.emit('send-message', { ...sentMsg, conversationId });
                      } catch (e) {
                        // Socket might not be available in SSR or import error
                        console.error('Socket emit failed:', e);
                      }
                    }
                  }
                } catch (error) {
                  console.error('Failed to send audio message:', error);
                }
              }}
              className="ml-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 "
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => setAudioBlob(null)}
              className="ml-2 text-red-500 hover:text-red-700 px-2 py-2 rounded-full focus:outline-none"
            >
              ✕
            </button>
          </div>
        ) : message.trim() || attachment ? (
          <button
            type="submit"
            className="ml-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 "
            disabled={recording || disabled || !!audioBlob}
          >
            Send
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="rounded-full p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {/* WhatsApp-style microphone icon */}
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="#25D366" strokeWidth="2" fill="none"/>
              <line x1="12" y1="22" x2="12" y2="18" stroke="#25D366" strokeWidth="2"/>
            </svg>
          </button>
        )}
      </form>
    </>
  );
}
