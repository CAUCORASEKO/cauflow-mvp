import { purchases } from "../models/purchases.memory.js";
import { licenses } from "../models/licenses.memory.js";

export const createPurchase = (req, res) => {
  const { licenseId, buyerEmail } = req.body;

  if (!licenseId || !buyerEmail) {
    return res.status(400).json({
      message: "licenseId and buyerEmail are required"
    });
  }

  const numericLicenseId = Number(licenseId);

  const licenseExists = licenses.find((item) => item.id === numericLicenseId);

  if (!licenseExists) {
    return res.status(404).json({
      message: "License not found. Cannot create purchase."
    });
  }

  const newPurchase = {
    id: purchases.length + 1,
    licenseId: numericLicenseId,
    buyerEmail,
    status: "completed"
  };

  purchases.push(newPurchase);

  res.status(201).json({
    message: "Purchase created successfully",
    data: newPurchase
  });
};

export const getPurchases = (req, res) => {
  res.status(200).json({
    message: "Purchases fetched successfully",
    data: purchases
  });
};

export const getPurchaseById = (req, res) => {
  const purchaseId = Number(req.params.id);

  const purchase = purchases.find((item) => item.id === purchaseId);

  if (!purchase) {
    return res.status(404).json({
      message: "Purchase not found"
    });
  }

  res.status(200).json({
    message: "Purchase fetched successfully",
    data: purchase
  });
};