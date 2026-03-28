import { licenses } from "../models/licenses.memory.js";
import { assets } from "../models/assets.memory.js";

export const createLicense = (req, res) => {
  const { assetId, type, price, usage } = req.body;

  if (!assetId || !type || price === undefined || !usage) {
    return res.status(400).json({
      message: "assetId, type, price and usage are required"
    });
  }

  const numericAssetId = Number(assetId);

  const assetExists = assets.find((item) => item.id === numericAssetId);

  if (!assetExists) {
    return res.status(404).json({
      message: "Asset not found. Cannot create license."
    });
  }

  const newLicense = {
    id: licenses.length + 1,
    assetId: numericAssetId,
    type,
    price,
    usage
  };

  licenses.push(newLicense);

  res.status(201).json({
    message: "License created successfully",
    data: newLicense
  });
};

export const getLicenses = (req, res) => {
  res.status(200).json({
    message: "Licenses fetched successfully",
    data: licenses
  });
};

export const getLicenseById = (req, res) => {
  const licenseId = Number(req.params.id);

  const license = licenses.find((item) => item.id === licenseId);

  if (!license) {
    return res.status(404).json({
      message: "License not found"
    });
  }

  res.status(200).json({
    message: "License fetched successfully",
    data: license
  });
};