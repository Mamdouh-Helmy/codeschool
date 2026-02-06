// lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} fileStr - Base64 string or file path
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export const uploadToCloudinary = async (fileStr, folder = 'section-images') => {
  try {
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      folder: folder,
      resource_type: 'auto',
      chunk_size: 15000000, // 15 MB in bytes (15 * 1024 * 1024 = 15728640)
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' }, // Limit max size
        { quality: 'auto:good' }, // Auto optimize quality
        { fetch_format: 'auto' } // Auto format (WebP if supported)
      ]
    });

    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
export const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
  const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
  
  return publicId;
};

export default cloudinary;