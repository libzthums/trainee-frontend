import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import * as XLSX from "xlsx";
import { UrlContext } from "../router/route";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

export default function InsertDocData() {
  const { url } = React.useContext(UrlContext);
  const [singleFile, setSingleFile] = useState(null);
  const [previewData, setPreviewData] = useState(null); // Parsed Excel data for preview
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  // Handle file change for single Excel file upload
  const handleSingleFileChange = (e) => {
    const file = e.target.files[0];
    setSingleFile(file);
    setPreviewData(null); // Clear previous preview if any
  };

  // Parse Excel file and update previewData state
  const handlePreview = async () => {
    if (!singleFile) {
      alert("Please select an Excel file");
      return;
    }

    try {
      const parsed = await parseExcelFile(singleFile);
      if (parsed.length === 0) {
        alert("Excel file is empty or invalid");
        return;
      }
      setPreviewData(parsed);
    } catch (error) {
      alert("Failed to parse Excel file");
      console.error(error);
    }
  };

  const parseExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          const parseDate = (value) => {
            if (!value) return "";
            if (typeof value === "number") {
              return new Date((value - 25569) * 86400 * 1000)
                .toISOString()
                .split("T")[0];
            }
            if (typeof value === "string" && !isNaN(Date.parse(value))) {
              return new Date(value).toISOString().split("T")[0];
            }
            return "";
          };

          const mappedData = jsonData.map((row) => ({
            DeviceName: row.Description || row["Description"] || "",
            serialNumber: row.serialNumber || row["S/N"] || "",
            contractNo: row.ContractNo || row["Contract No."] || "",
            Brand: row.Brand || row["Brand"] || "",
            Model: row.Model || row["Model"] || "",
            Type: row.Type || row["Type"] || "",
            Location: row.Location || row["Location"] || "",
            divisionID: row.divisionID || row["Division ID"] || "",
            price: parseFloat(
              row.price ||
                row.Price ||
                row["Price"] ||
                row["price"] ||
                row["PRICE"] ||
                "0"
            ),
            startDate: parseDate(row.startDate || row["Issue Date"]) || "",
            endDate: parseDate(row.endDate || row["Expire Date"]) || "",
            vendorName: row.vendorName || row["Vendor Name"] || "",
            prFileName: row.prFileName || row["PR"] || "",
            poFileName: row.poFileName || row["PO"] || "",
            contractFileName: row.contractFileName || row["Contract"] || "",
          }));

          resolve(mappedData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleSubmitServiceData = async () => {
    if (uploading || !singleFile) return;
    setUploading(true);

    try {
      let dataToUpload = previewData;

      if (!previewData) {
        dataToUpload = await parseExcelFile(singleFile);
        if (!dataToUpload || dataToUpload.length === 0) {
          alert("Excel file is empty or invalid");
          setUploading(false);
          return;
        }
      }

      const response = await axios.post(
        url + "service/insertdata",
        dataToUpload
      );

      if (response.status === 200 || response.status === 201) {
        alert("Service data saved successfully");
        setSingleFile(null);
        setPreviewData(null);
      } else {
        alert("Failed to save service data!!");
      }
    } catch (err) {
      console.error("Error during submission:", err);
      alert("An error occurred while submitting service data");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitDocuments = async () => {
    if (multipleFiles.length === 0) {
      alert("Please select at least one file to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      multipleFiles.forEach((file) => formData.append("files", file));

      await axios.post(url + "service/insertdoc", formData);

      alert("Files uploaded and linked to service successfully");
      setMultipleFiles([]);
    } catch (err) {
      console.error("Error during file upload:", err);
      alert("An error occurred while uploading documents");
    } finally {
      setUploading(false);
    }
  };

  // Setup Dropzone for multiple file upload
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      setMultipleFiles((prevFiles) => [...prevFiles, ...acceptedFiles]); // Add files to the previous array
    },
    multiple: true,
  });

  return (
    <div className="container p-4">
      <div className="row align-items-center mt-4 mb-4">
        <div className="col-auto">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i> Back
          </Button>
        </div>
        <div className="col">
          <h2>Document Upload</h2>
        </div>
      </div>
      {/* Single Excel file section with preview */}
      <div className="mt-5">
        <input
          type="file"
          className="form-control"
          accept=".xlsx, .xls"
          onChange={handleSingleFileChange}
        />
        <div>
          <small>
            If you don't have a template, please download an Excel template{" "}
            <a href="/template.xlsx" download>
              HERE
            </a>
          </small>
        </div>

        <div className="d-flex justify-content-center mt-3">
          <button
            className="btn btn-primary me-2"
            onClick={handlePreview}
            disabled={uploading || !singleFile}>
            {uploading ? "Processing..." : "Preview"}
          </button>
          <button
            className="btn btn-success"
            onClick={handleSubmitServiceData}
            disabled={uploading}>
            {uploading ? "Saving Data..." : "Submit Data"}
          </button>
        </div>
        {singleFile && !previewData && (
          <div className="mt-3">
            <p>Selected File: {singleFile.name}</p>
          </div>
        )}
      </div>

      {/* Preview Table for Excel Data */}
      {previewData && (
        <div className="mt-5">
          <h4>Preview Data</h4>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr style={{ minWidth: "600px" }}>
                  {Object.keys(previewData[0]).map((header, idx) => (
                    <th key={idx}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell.toString()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multiple file upload section with preview */}
      <div className="mb-3 mt-5">
        <div
          {...getRootProps()}
          className="dropzone p-3 border border-dashed"
          style={{
            borderColor: "#007bff",
            borderWidth: "2px",
            borderRadius: "4px",
            textAlign: "center",
          }}>
          <input {...getInputProps()} />
          <p>Drag & Drop your files here, or click to select files</p>
        </div>
        <div className="d-flex justify-content-center mt-3 gap-2">
          <button
            className="btn btn-primary"
            onClick={handleSubmitDocuments}
            disabled={uploading}>
            {uploading ? "Uploading Files..." : "Upload Documents"}
          </button>
        </div>

        {multipleFiles.length > 0 && (
          <div className="mt-3">
            <h4>Preview Selected Files:</h4>
            <ul>
              {multipleFiles.map((file, index) => (
                <li key={index}>{file.name}</li> // List all selected files
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
