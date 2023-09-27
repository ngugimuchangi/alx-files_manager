/* eslint-disable no-await-in-loop */
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';

/**
 * Generate thumbnails for a file
 * @param {str} localPath - path to file in local storage
 * @param {number[]} sizes - array of thumbnail sizes
 */
async function generateThumbnail(localPath, sizes = [100, 250, 500]) {
  // Check if file exists local storage
  if (!fs.existsSync(localPath)) throw (new Error('File not found'));

  // Create thumbnails and save to local storage
  for (const thumbnailSize of sizes) {
    const thumbnailBuffer = await imageThumbnail(localPath, { width: thumbnailSize });
    fs.writeFileSync(`${localPath}_${thumbnailSize}`, thumbnailBuffer);
  }
}

export default generateThumbnail;
