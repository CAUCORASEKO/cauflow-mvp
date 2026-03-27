export const uploadAsset = (req, res) => {
  const { title, description } = req.body;

  res.status(201).json({
    message: "Asset uploaded successfully",
    data: {
      title,
      description
    }
  });
};