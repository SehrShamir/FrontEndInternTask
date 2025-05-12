'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

 //Toolbar Optiopns

const TOOLBAR_OPTIONS = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ align: [] }],
    ['image', 'blockquote', 'code-block'],
    ['clean'],
  ],
}

const SAVE_INTERVAL_MS = 2000
let yText;

const Editor = () => {
  const quillRef = useRef<HTMLDivElement | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const quillInstance = useRef<any>(null)

  useEffect(() => {
    if (!username) {
      const name =
        prompt('Enter your username') || `User-${Math.floor(Math.random() * 1000)}`
      setUsername(name)
    }


    const loadEditor = async () => {
      const Quill = (await import('quill')).default
      const QuillCursors = (await import('quill-cursors')).default
      Quill.register('modules/cursors', QuillCursors)

      const ydoc = new Y.Doc()
      const provider = new WebsocketProvider('ws://localhost:3000', 'realtime-room', ydoc)

      yText = ydoc.getText('quill')

      if (quillRef.current && !quillInstance.current) {
        const quill = new Quill(quillRef.current, {
          theme: 'snow',
          placeholder: 'Start typing...',
          modules: {
            toolbar: TOOLBAR_OPTIONS.toolbar,
            cursors: true,
          },
        })

        quillInstance.current = quill

        // Load existing content from Yjs
        quill.setText(yText.toString())

        yText.observe(() => {
          const currentText = yText.toString()
          if (quill.getText().trim() !== currentText.trim()) {
            const sel = quill.getSelection()
            quill.setText(currentText)
            if (sel) quill.setSelection(sel)
          }
        })

        quill.on('text-change', () => {
          const delta = quill.getContents()
          yText.applyDelta(delta)
        })
      }
    }

    if (username) loadEditor()
  }, [username])

  // auto save to localstorage after very 2 sec
  useEffect(() => {
    const interval = setInterval(() => {
      const quill = quillInstance.current;

      if (quill) {
        const content = quill.getContents(); // Full Delta object
        localStorage.setItem('autosave-content', JSON.stringify(content));
        console.log('Auto-saved at', new Date().toLocaleTimeString());
      }
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

useEffect(() => {
  const quill = quillInstance.current;

  // restore cotaions on mount
  if (quill) {
    const saved = localStorage.getItem('autosave-content');
    if (saved) {
      try {
        quill.setContents(JSON.parse(saved));
      } catch (err) {
        console.error('Error restoring content:', err);
      }
    }
  }

  // linsten changes form the localstore form other tabs
  const handleStorage = (event: StorageEvent) => {
    console.log("qwee ", event)
    if (event.key === 'autosave-content' && quill) {
      try {
        const updatedContent = JSON.parse(event.newValue || '');
      if(updatedContent && yText){
         yText.delete(0, yText.length); // clear the changes
         yText.insert(0, Quill.import('delta').prototype.constructor ? updatedContent.ops.map(op => op.insert).join('') : ''); 
      }
        console.log({updatedContent })
        quill.setContents(updatedContent);
        console.log('🔄 Synced content from another tab');
      } catch (error) {
        console.error('Error syncing content:', error);
      }
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('storage', handleStorage);
  };
}, []);


  return (
    <div className="max-w-4xl mx-auto p-4 mt-10">
      <h1 className="text-2xl font-bold mb-4 text-center">Real-Time Collaborative Editor</h1>
      <p className="text-sm mb-2 text-center text-gray-600">
        Logged in as: <strong>{username}</strong>
      </p>
      <div
        ref={quillRef}
        className="bg-white rounded shadow min-h-[300px] w-full"
      />
    </div>
  )
}

export default Editor
