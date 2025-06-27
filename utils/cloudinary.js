const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (buffer, mimetype, folder) => {
  return await cloudinary.uploader.upload_stream({
    resource_type: mimetype.startsWith('audio/') ? 'video' : 'image',
    folder
  }, (error, result) => {
    if (error) throw error;
    return result;
  }).end(buffer);
};

const deleteFromCloudinary = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId, {
    resource_type: 'video' // funciona tanto para imagem quanto vídeo
  });
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };