const assets = [];

export const uploadAsset = (req, res) => {
  const { title, description } = req.body;

  const newAsset = {
    id: assets.length + 1,
    title,
    description
  };

  assets.push(newAsset);

  res.status(201).json({
    message: "Asset uploaded successfully",
    data: newAsset
  });
};

export const getAssets = (req, res) => {
  res.status(200).json({
    message: "Assets fetched successfully",
    data: assets
  });
};

export const getAssetById = (req, res) => {
  const assetId = Number(req.params.id);

  const asset = assets.find((item) => item.id === assetId);

  if (!asset) {
    return res.status(404).json({
      message: "Asset not found"
    });
  }

  res.status(200).json({
    message: "Asset fetched successfully",
    data: asset
  });
};