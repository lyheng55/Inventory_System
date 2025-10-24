import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  ListItemSecondaryAction,
  Chip,
  Alert,
  Collapse,
  Paper,
  Fade,
  Zoom
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Image,
  Description,
  Visibility,
  Close,
  CheckCircle,
  Error,
  Pause,
  PlayArrow,
  Refresh,
  Upload,
  FolderOpen,
  Compress
} from '@mui/icons-material';
import axios from '../../utils/axios';
import { 
  createFilePreviewUrl, 
  revokeFilePreviewUrl, 
  isFilePreviewSupported,
  getFileIcon as getFileIconType,
  validateFileForPreview
} from '../../utils/filePreview';
import { 
  compressImage, 
  needsCompression, 
  getCompressionEstimate,
  formatFileSize as formatSize
} from '../../utils/fileCompression';
import { createFileUploadQueue } from '../../utils/fileQueue';

const EnhancedFileUpload = ({
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
  disabled = false,
  enableCompression = true,
  enableQueue = true,
  maxConcurrent = 3,
  showCompressionInfo = true,
  showQueueStats = true
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [queueStats, setQueueStats] = useState({ total: 0, completed: 0, failed: 0, active: 0 });
  const [compressionInfo, setCompressionInfo] = useState({});
  const [showQueue, setShowQueue] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const fileInputRef = useRef(null);

  // Initialize upload queue
  useEffect(() => {
    if (enableQueue) {
      const queue = createFileUploadQueue({
        maxConcurrent,
        onProgress: (item) => {
          setUploadProgress(prev => ({ ...prev, [item.id]: item.progress }));
        },
        onComplete: (item) => {
          setUploadProgress(prev => ({ ...prev, [item.id]: 100 }));
          onUpload?.(item.result);
        },
        onError: (item) => {
          onError?.(item.error.message);
        },
        onQueueUpdate: (stats) => {
          setQueueStats(stats);
          setUploadQueue(stats.queue);
        }
      });
      setUploadQueue(queue);
    }
  }, [enableQueue, maxConcurrent, onUpload, onError]);

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [disabled]);

  const handleFiles = async (selectedFiles) => {
    // Validate file count
    if (selectedFiles.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} file(s) allowed`);
      return;
    }

    // Validate file sizes and types
    const validFiles = [];
    const compressionPromises = [];

    for (const file of selectedFiles) {
      if (file.size > maxSize) {
        onError?.(`File ${file.name} is too large. Maximum size: ${formatSize(maxSize)}`);
        continue;
      }

      if (accept && !file.type.match(accept.replace(/\*/g, '.*'))) {
        onError?.(`File ${file.name} is not a supported type`);
        continue;
      }

      // Check if compression is needed
      if (enableCompression && needsCompression(file)) {
        const estimate = getCompressionEstimate(file);
        setCompressionInfo(prev => ({ ...prev, [file.name]: estimate }));
        
        try {
          const compressedFile = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8,
            maxSizeKB: 1024
          });
          validFiles.push(compressedFile);
        } catch (error) {
          console.warn(`Compression failed for ${file.name}, using original:`, error);
          validFiles.push(file);
        }
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    setFiles(prev => [...prev, ...validFiles]);

    // Upload files
    if (enableQueue && uploadQueue) {
      uploadQueue.addFiles(validFiles, {
        endpoint: `/api/uploads/${uploadType}`,
        fieldName: uploadType,
        token: localStorage.getItem('token')
      });
    } else {
      // Fallback to individual uploads
      for (const file of validFiles) {
        await uploadFile(file);
      }
    }
  };

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    // Clear the input value to allow selecting the same file again
    event.target.value = '';
    
    handleFiles(selectedFiles);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append(uploadType, file);
      
      if (referenceId) {
        formData.append('referenceId', referenceId);
      }
      
      if (description) {
        formData.append('description', description);
      }

      const response = await axios.post(`/uploads/${uploadType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
          onProgress?.(progress);
        }
      });

      onUpload?.(response.data);
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = (index) => {
    const fileToRemove = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    
    // Remove from compression info
    if (compressionInfo[fileToRemove.name]) {
      setCompressionInfo(prev => {
        const newInfo = { ...prev };
        delete newInfo[fileToRemove.name];
        return newInfo;
      });
    }
    
    onRemove?.(fileToRemove);
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'uploading':
        return <Upload color="primary" />;
      default:
        return null;
    }
  };

  const retryFailedUploads = () => {
    if (uploadQueue) {
      uploadQueue.retryFailed();
    }
  };

  const cancelAllUploads = () => {
    if (uploadQueue) {
      uploadQueue.cancelAll();
    }
  };

  return (
    <Box>
      {/* Drag and Drop Area */}
      <Paper
        elevation={dragActive ? 8 : 2}
        sx={{
          p: 3,
          textAlign: 'center',
          border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
          backgroundColor: dragActive ? '#f5f5f5' : 'transparent',
          transition: 'all 0.3s ease',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
      >
        <Fade in={true}>
          <Box>
            <CloudUpload 
              sx={{ 
                fontSize: 48, 
                color: dragActive ? '#1976d2' : '#666',
                mb: 2 
              }} 
            />
            <Typography variant="h6" gutterBottom>
              {dragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {accept === 'image/*' ? 'Images' : 'Files'} up to {formatSize(maxSize)}
              {multiple && ` (max ${maxFiles} files)`}
            </Typography>
            
            {enableCompression && (
              <Chip
                icon={<Compress />}
                label="Auto-compression enabled"
                color="primary"
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        </Fade>
      </Paper>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Queue Statistics */}
      {enableQueue && showQueueStats && queueStats.total > 0 && (
        <Collapse in={true}>
          <Alert 
            severity="info" 
            sx={{ mt: 2 }}
            action={
              <Box>
                <IconButton
                  size="small"
                  onClick={() => setShowQueue(!showQueue)}
                >
                  {showQueue ? <Close /> : <FolderOpen />}
                </IconButton>
                {queueStats.failed > 0 && (
                  <IconButton size="small" onClick={retryFailedUploads}>
                    <Refresh />
                  </IconButton>
                )}
                {queueStats.active > 0 && (
                  <IconButton size="small" onClick={cancelAllUploads}>
                    <Pause />
                  </IconButton>
                )}
              </Box>
            }
          >
            <Typography variant="body2">
              Queue: {queueStats.completed}/{queueStats.total} completed
              {queueStats.failed > 0 && `, ${queueStats.failed} failed`}
              {queueStats.active > 0 && `, ${queueStats.active} uploading`}
            </Typography>
          </Alert>
        </Collapse>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Selected Files ({files.length})
          </Typography>
          
          {files.map((file, index) => (
            <Zoom in={true} key={index}>
              <Card sx={{ mb: 1 }}>
                <CardContent sx={{ py: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" flex={1}>
                      {getFileIcon(file)}
                      <Box sx={{ ml: 2, flex: 1 }}>
                        <Typography variant="body2" noWrap>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatSize(file.size)}
                          {compressionInfo[file.name] && (
                            <Chip
                              label={`Compressed: ${compressionInfo[file.name].reductionPercent}% smaller`}
                              size="small"
                              color="success"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box display="flex" alignItems="center">
                      {isFilePreviewSupported(file) && (
                        <IconButton
                          size="small"
                          onClick={() => handlePreview(file)}
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
                  
                  {/* Upload Progress */}
                  {uploadProgress > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Zoom>
          ))}
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={!!previewUrl}
        onClose={closePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
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
            <Box textAlign="center">
              <img
                src={previewUrl}
                alt={previewFile?.name}
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

export default EnhancedFileUpload;
