import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Image,
  Description,
  Visibility,
  Close
} from '@mui/icons-material';
import axios from '../../utils/axios';
import { 
  createFilePreviewUrl, 
  revokeFilePreviewUrl, 
  isFilePreviewSupported,
  getFileIcon as getFileIconType,
  validateFileForPreview
} from '../../utils/filePreview';

const FileUpload = ({
  accept = 'image/*',
  multiple = false,
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024, // 5MB
  onUpload,
  onError,
  onRemove,
  existingFiles = [],
  uploadType = 'productImage',
  referenceId = null,
  description = null,
  disabled = false
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokeFilePreviewUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    // Clear the input value to allow selecting the same file again
    event.target.value = '';
    
    // Validate file count
    if (selectedFiles.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} file(s) allowed`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = selectedFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      onError?.(`File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    setFiles(selectedFiles);
    
    // Auto-upload for product images (single file, non-multiple)
    if (uploadType === 'productImage' && !multiple && selectedFiles.length === 1) {
      // Trigger upload automatically
      await handleUploadForFiles(selectedFiles);
    }
  };
  
  const handleUploadForFiles = async (filesToUpload) => {
    if (filesToUpload.length === 0) {
      onError?.('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      // Add files to form data
      if (multiple) {
        filesToUpload.forEach(file => {
          formData.append(uploadType === 'productImage' ? 'productImages' : 'documents', file);
        });
      } else {
        formData.append(uploadType, filesToUpload[0]);
      }

      // Add additional data
      if (referenceId) {
        formData.append('productId', referenceId);
      }
      if (description) {
        formData.append('description', description);
      }
      if (uploadType === 'document') {
        formData.append('type', 'general');
      }

      const endpoint = multiple 
        ? (uploadType === 'productImage' ? '/uploads/product-images' : '/uploads/documents')
        : (uploadType === 'productImage' ? '/uploads/product-image' : '/uploads/document');

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      setUploading(false);
      setUploadProgress(0);
      setFiles([]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUpload?.(response.data);
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      console.error('Upload error:', error);
      onError?.(error.response?.data?.error || 'Upload failed');
    }
  };

  const handleUpload = async () => {
    await handleUploadForFiles(files);
  };

  const handleRemoveFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  const handleRemoveExistingFile = async (filePath) => {
    try {
      await axios.delete('/uploads/file', {
        data: { filePath }
      });
      onRemove?.(filePath);
    } catch (error) {
      console.error('Remove file error:', error);
      onError?.(error.response?.data?.error || 'Failed to remove file');
    }
  };

  const handlePreview = (file) => {
    const validation = validateFileForPreview(file);
    
    if (validation.isValid && validation.canPreview) {
      const url = createFilePreviewUrl(file);
      if (url) {
        setPreviewUrl(url);
        setPreviewFile(file);
      } else {
        onError?.('Preview not available in this environment');
      }
    } else {
      onError?.(validation.error || 'Preview not supported for this file type');
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      revokeFilePreviewUrl(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    const iconType = getFileIconType(file);
    
    switch (iconType) {
      case 'image':
        return <Image />;
      case 'picture_as_pdf':
        return <Description />;
      default:
        return <Description />;
    }
  };

  return (
    <Box>
      {/* Upload Area */}
      <Box
        component="label"
        htmlFor={`file-upload-${uploadType}`}
        sx={{
          border: '2px dashed',
          borderColor: 'primary.main',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          backgroundColor: 'grey.50',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          display: 'block',
          position: 'relative',
          userSelect: 'none',
          '&:hover': {
            backgroundColor: disabled ? 'grey.50' : 'primary.50',
          },
          '&:active': {
            backgroundColor: disabled ? 'grey.50' : 'primary.100',
          }
        }}
      >
        <input
          id={`file-upload-${uploadType}`}
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            zIndex: 10,
            fontSize: 0
          }}
          disabled={disabled}
        />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2, pointerEvents: 'none', position: 'relative', zIndex: 0 }} />
        <Typography variant="h6" gutterBottom sx={{ pointerEvents: 'none', position: 'relative', zIndex: 0 }}>
          {multiple ? 'Upload Files' : 'Upload File'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ pointerEvents: 'none', position: 'relative', zIndex: 0 }}>
          Click to select files or drag and drop
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, pointerEvents: 'none', position: 'relative', zIndex: 0 }}>
          Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
          {multiple && ` • Max files: ${maxFiles}`}
        </Typography>
      </Box>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Uploading... {uploadProgress}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Selected Files */}
      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Files:
          </Typography>
          {files.map((file, index) => (
            <Card key={index} sx={{ mb: 1 }}>
              <CardContent sx={{ py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getFileIcon(file)}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="body2">{file.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    {isFilePreviewSupported(file) && (
                      <IconButton
                        size="small"
                        onClick={() => handlePreview(file)}
                        sx={{ mr: 1 }}
                        title="Preview file"
                      >
                        <Visibility />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveFile(index)}
                      color="error"
                      title="Remove file"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
          
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading}
            sx={{ mt: 2 }}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </Box>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Files:
          </Typography>
          <List>
            {existingFiles.map((file, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={file.name || file.filename}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {file.size ? formatFileSize(file.size) : ''}
                      </Typography>
                      {file.url && (
                        <Button
                          size="small"
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ mt: 0.5 }}
                        >
                          View
                        </Button>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveExistingFile(file.path || file)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewUrl}
        onClose={closePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {previewFile?.name}
            </Typography>
            <IconButton onClick={closePreview}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FileUpload;
