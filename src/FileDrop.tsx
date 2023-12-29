import React, { useState } from 'react'

interface FileDropProps {
  onFileDrop: (file: File) => void
}

const FileDrop: React.FC<FileDropProps> = ({ onFileDrop }) => {
  const [fileName, setFileName] = useState('')

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      onFileDrop(file)
      setFileName(file.name)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null
    if (file) {
      onFileDrop(file)
      setFileName(file.name)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        width: '300px',
        height: '200px',
        border: '1px dashed black',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ position: 'absolute', left: 20, top: '25%' }}>
        {fileName ? (
          <>
            <span>{fileName}</span>
            <br />
            <br />
            <span>
              Arraste outro PDF ou{' '}
              <span style={{ textDecoration: 'underline', color: 'blue' }}>
                clique aqui
              </span>{' '}
              para selecionar um arquivo
            </span>
          </>
        ) : (
          <span>
            Arraste o PDF ou{' '}
            <span style={{ textDecoration: 'underline', color: 'blue' }}>
              clique aqui
            </span>{' '}
            para selecionar um arquivo
          </span>
        )}
      </div>
      <input
        type="file"
        onChange={handleChange}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          opacity: 0,
          cursor: 'pointer',
        }}
      />
    </div>
  )
}

export default FileDrop
