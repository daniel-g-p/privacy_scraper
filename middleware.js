import multer from "multer";

const upload = multer();

const uploadFile = (fileName) => {
  return upload.single(
    typeof fileName === "string" && fileName ? fileName : "file"
  );
};

export default {
  uploadFile,
};
