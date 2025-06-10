import React, { useContext, useState, useEffect } from "react";
import axios from "axios";
import { UrlContext } from "../router/route";
// import { useUser } from "../context/userContext";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { UserContext } from "../context/UserProvider";

export default function InsertData() {
  const { url, rfq } = useContext(UrlContext);
  // const { user, activeDivision } = useUser();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [vendorAll, setVendorAll] = useState([]);

  const [formData, setFormData] = useState({
    DeviceName: "",
    divisionID: "",
    price: "",
    startDate: "",
    endDate: "",
    vendorName: "",
    vendorPhone: "",
    serialNumber: "",
    contractNo: "",
    Brand: "",
    Model: "",
    Type: "",
    Location: "",
  });

  const [division, setDivisions] = useState([]);
  const [typeList, setTypeList] = useState([]); // State for Type dropdown options
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    // Fetch divisions
    axios
      .get(url + "service/division")
      .then((response) => {
        setDivisions(response.data);
      })
      .catch((error) => console.error("Error fetching divisions:", error));

    // Fetch types
    axios
      .get(url + "service/typeList")
      .then((response) => {
        setTypeList(response.data);
      })
      .catch((error) => console.error("Error fetching types:", error));
  }, [url]);

  useEffect(() => {
    if (user.divisionID) {
      setFormData((prev) => ({
        ...prev,
        divisionID: user.divisionID,
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate that the end date is not earlier than the start date
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      alert("End Date cannot be earlier than Start Date.");
      return;
    }

    try {
      const response = await axios.post(url + "service/insertdata", formData);
      const serviceID = response.data.serviceID; // Capture the serviceID from the response

      if (!serviceID) {
        alert("Failed to create service. Please try again.");
        return;
      }

      if (uploadedFiles.length > 0) {
        const formDataFile = new FormData();
        uploadedFiles.forEach((file) => {
          formDataFile.append("files", file.file);
        });
        const fileTypes = uploadedFiles.map((file) => file.type);
        formDataFile.append("fileTypes", JSON.stringify(fileTypes));
        formDataFile.append("serviceID", serviceID);

        await axios.post(url + "service/insertdoc", formDataFile);

        console.log("Files uploaded successfully.");
      }

      alert("Service added successfully!");

      // Reset form
      setFormData({
        DeviceName: "",
        divisionID: user.divisionID,
        price: "",
        startDate: "",
        endDate: "",
        vendorName: "",
        vendorPhone: "",
        serialNumber: "",
        contractNo: "",
        Brand: "",
        Model: "",
        Type: "",
        Location: "",
      });
      setSelectedFile("");
      setFileType("");
      setUploadedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error submitting data or uploading files:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleClear = () => {
    setFormData({
      DeviceName: "",
      divisionID: user.divisionID,
      price: "",
      startDate: "",
      endDate: "",
      vendorName: "",
      vendorPhone: "",
      serialNumber: "",
      contractNo: "",
      Brand: "",
      Model: "",
      Type: "",
      Location: "",
    });
      setSelectedFile("");
      setFileType("");
      setUploadedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (!selectedFile || !fileType) {
      alert("Please select a file and file type before uploading.");
      return;
    }

    // Validate file type
    const allowedTypes = ["contract", "pr", "po"];
    if (!allowedTypes.includes(fileType)) {
      alert("Invalid file type selected.");
      return;
    }

    setUploadedFiles((prev) => [
      ...prev,
      { file: selectedFile, type: fileType },
    ]);
    setSelectedFile("");
    setFileType("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getVendorAll = async () => {
    let res = await axios.get(rfq + "vendor/vendor", {
      params: {
        status: "all",
      },
    });
    setVendorAll(res.data);
  };

  useEffect(() => {
    getVendorAll();
  }, []);

  return (
    <div className="container p-4">
      <div className="row align-items-center mt-4 mb-4">
        <div className="col-auto">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i> Back
          </Button>
        </div>
        <div className="col-auto">
          <h2>Manual Upload</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6 mb-1">
            <label>
              Description <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              name="DeviceName"
              value={formData.DeviceName}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div className="col-md-6 mb-1">
            <label>
              Division <span style={{ color: "red" }}>*</span>
            </label>
            <select
              className="form-control"
              name="divisionID"
              value={formData.divisionID}
              onChange={handleChange}
              required
              disabled={!(user.permissionID === 2)}>
              <option value="">Select Division</option>
              {division.map((d) => (
                <option key={d.divisionID} value={d.divisionID}>
                  {d.divisionName}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6 mb-1">
            <label>S/N</label>
            <input
              type="text"
              className="form-control"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>

          <div className="col-md-6 mb-1">
            <label>Contract No.</label>
            <input
              type="text"
              className="form-control"
              name="contractNo"
              value={formData.contractNo}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>

          <div className="col-md-6 mb-1">
            <label>Brand</label>
            <input
              type="text"
              className="form-control"
              name="Brand"
              value={formData.Brand}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>

          <div className="col-md-6 mb-1">
            <label>Model</label>
            <input
              type="text"
              className="form-control"
              name="Model"
              value={formData.Model}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>

          <div className="col-md-6 mb-1">
            <label>
              Type <span style={{ color: "red" }}>*</span>
            </label>
            <select
              className="form-control"
              name="Type"
              value={formData.Type}
              onChange={handleChange}
              required>
              <option value="">Select Type</option>
              {typeList.map((type) => (
                <option key={type.TypeId} value={type.TypeName}>
                  {type.TypeName}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6 mb-1">
            <label>Location</label>
            <input
              type="text"
              className="form-control"
              name="Location"
              value={formData.Location}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>

          <div className="col-md-6 mb-1">
            <label>
              Price <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="number"
              className="form-control"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div className="col-md-6 mb-1">
            <label>
              Vendor Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              name="vendorName"
              value={formData.vendorName}
              onChange={handleChange}
              required
              list="vendorOption"
            />
            <datalist id="vendorOption">
              {vendorAll.map((item, index) => (
                <option value={item.vendor_name} />
              ))}
            </datalist>
          </div>

          <div className="col-md-6 mb-1">
            <label>
              Issue Date <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="date"
              className="form-control"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              autoComplete="off"
              required
            />
          </div>

          <div className="col-md-6 mb-1">
            <label>
              Expired Date <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="date"
              className="form-control"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              autoComplete="off"
              required
            />
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-md-4">
            <input
              type="file"
              className="form-control"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
          </div>
          <div className="col-md-4">
            <select
              className="form-control"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}>
              <option value="">---Select Type---</option>
              <option value="contract">Contract</option>
              <option value="pr">PR</option>
              <option value="po">PO</option>
            </select>
          </div>
          <div className="col-md-4">
            <button
              className="btn btn-success"
              onClick={handleUpload}
              type="button"
              disabled={!selectedFile || !fileType}>
              Upload
            </button>
          </div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-3">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {uploadedFiles.map((file, index) => (
                  <tr key={index}>
                    <td>{file.file.name}</td>
                    <td>{file.type}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveFile(index)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="form-group mt-3 text-center">
          <button type="submit" className="btn btn-primary">
            Save
          </button>
          <button
            type="button"
            className="btn btn-warning ml-2"
            onClick={handleClear}>
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
