import fs from 'fs';
import imageThumbnail from 'image-thumbnail';

async function generateThumbnail(localPath, size) {
  // Check if file exists in db and local storage
  if (!fs.existsSync(localPath)) throw (new Error('File not found'));

  // Create thumbnail
  const thumbnail = await imageThumbnail(localPath, { width: size });
  fs.writeFileSync(`${localPath}_${size}`, thumbnail);
}

export default generateThumbnail;
