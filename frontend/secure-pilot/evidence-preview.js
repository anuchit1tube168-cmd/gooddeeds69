/* Local preview preparation. The original file is not uploaded by this module. */
(function(root){
  'use strict';
  async function prepare(file){
    if(!file.type.startsWith('image/')||typeof root.createImageBitmap!=='function')return file;
    let bitmap;
    try{
      bitmap=await root.createImageBitmap(file);
      if(bitmap.width<1||bitmap.height<1||bitmap.width*bitmap.height>24000000)throw Error('IMAGE_DIMENSIONS');
      const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.82));
      return blob&&blob.size<file.size?blob:file;
    }catch(_){throw Error('ไม่สามารถเตรียมภาพนี้ได้ กรุณาใช้ภาพที่เปิดอ่านได้และไม่เกิน 24 ล้านพิกเซล');}
    finally{bitmap?.close();}
  }
  root.GoodDeedEvidence=Object.freeze({prepare});
})(window);
