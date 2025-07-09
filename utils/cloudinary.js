const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (buffer, mimetype, folder) => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Arquivo de imagem vazio ou inválido');
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: 'image'
  });
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };