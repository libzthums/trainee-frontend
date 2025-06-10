import React, { useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useLocation, Link, useParams } from "react-router-dom";
import { UrlContext } from "../router/route";
import {
  Button,
  Badge,
  InputGroup,
  FormControl,
  FormLabel,
  FormGroup,
  Modal,
  Form,
  Row,
  Col,
  Table,
  Tabs,
  Tab,
} from "react-bootstrap";
import { DataGrid } from "@mui/x-data-grid";
import { UserContext } from "../context/UserProvider";
// import { useUser } from "../context/userContext";

export default function Reissue() {
  const { url, rfq } = useContext(UrlContext);
  const location = useLocation();
  const { user } = useContext(UserContext);

  const { status } = useParams();

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showReissueModal, setShowReissueModal] = useState(false);
  const [reissueData, setReissueData] = useState(null);
  // const { user, activeDivision } = useUser();
  const [vendorAll, setVendorAll] = useState([]);
  const fileInputRef = React.useRef(null);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    deviceQuery: "",
    serialQuery: "",
    contractQuery: "",
    divisionQuery: "",
    totalPriceQuery: "",
    pricePerMonthQuery: "",
    vendorNameQuery: "",
    dateOfIssueFrom: "",
    dateOfIssueTo: "",
    dateOfExpiredFrom: "",
    dateOfExpiredTo: "",
    priceMin: "",
    priceMax: "",
    Brand: "",
    Model: "",
    Type: "",
    Location: "",
  });

  const openFile = async (file, area) => {
    console.log("area ", area);

    try {
      let res = await axios.get(url + "doc/open", {
        params: {
          fileName: encodeURIComponent(file),
        },
        responseType: "blob",
      });
      const pdfBlob = new Blob([res.data], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      window.open(pdfUrl, "_blank");
    } catch (error) {
      alert(error);
    }
  };

  const [typeList, setTypeList] = useState([]);
  const [tempFilters, setTempFilters] = useState({ ...filters });

  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState("");
  const [prDocs, setPrDocs] = useState([]);
  const [poDocs, setPoDocs] = useState([]);
  const [contractDocs, setContractDocs] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (!selectedFile || !fileType) {
      alert("Please select a file and file type before uploading.");
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

  // Fetch data
  const fetchData = useCallback(() => {
    axios
      .get(url + "service")
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // if (!activeDivision) return;

    const lowerSearch = searchQuery.toLowerCase();

    // const isAdminOrManager =
    //   user.permissionCode === 2;

    const matchesQuery = (field, query) =>
      (field ?? "")
        .toString()
        .toLowerCase()
        .trim()
        .includes(query.toLowerCase().trim());

    const isWithinMonthRange = (rowDate, from, to) => {
      if (!rowDate) return false;
      const rowMonth = rowDate.slice(0, 7); // "YYYY-MM"
      if (from && rowMonth < from) return false;
      if (to && rowMonth > to) return false;
      return true;
    };

    const matchesPriceRange = (price) => {
      const min = filters.priceMin ? parseFloat(filters.priceMin) : -Infinity;
      const max = filters.priceMax ? parseFloat(filters.priceMax) : Infinity;
      return price >= min && price <= max;
    };

    const matchesStatus = (statusID) => {
      const statusMap = {
        1: [1, 2],
        2: [3, 4],
      };
      const validStatuses = statusMap[status] || [];
      return validStatuses.includes(statusID);
    };

    const result = data.filter((item) => {
      const divisionMatch = item.divisionID === user.divisionID;

      const statusMatch = matchesStatus(item.statusID);

      const searchMatch =
        !searchQuery ||
        matchesQuery(item.DeviceName, lowerSearch) ||
        matchesQuery(item.serialNumber, lowerSearch) ||
        matchesQuery(item.contractNo, lowerSearch) ||
        matchesQuery(item.vendorName, lowerSearch) ||
        matchesQuery(item.Location, lowerSearch) ||
        matchesQuery(item.Type, lowerSearch) ||
        matchesQuery(item.Brand, lowerSearch) ||
        matchesQuery(item.Model, lowerSearch);

      const filterConditions = [
        !filters.deviceQuery ||
          matchesQuery(item.DeviceName, filters.deviceQuery),
        !filters.serialQuery ||
          matchesQuery(item.serialNumber, filters.serialQuery),
        !filters.contractQuery ||
          matchesQuery(item.contractNo, filters.contractQuery),
        !filters.divisionQuery ||
          matchesQuery(item.divisionName, filters.divisionQuery),
        !filters.totalPriceQuery ||
          item.price?.toString().includes(filters.totalPriceQuery),
        !filters.pricePerMonthQuery ||
          item.monthly_charge?.toString().includes(filters.pricePerMonthQuery),
        !filters.vendorNameQuery ||
          matchesQuery(item.vendorName, filters.vendorNameQuery),
        isWithinMonthRange(
          item.startDate,
          filters.dateOfIssueFrom,
          filters.dateOfIssueTo
        ) &&
          isWithinMonthRange(
            item.endDate,
            filters.dateOfExpiredFrom,
            filters.dateOfExpiredTo
          ) &&
          matchesPriceRange(parseFloat(item.monthly_charge)),
        !filters.Brand || matchesQuery(item.Brand, filters.Brand),
        !filters.Model || matchesQuery(item.Model, filters.Model),
        !filters.Type || matchesQuery(item.Type, filters.Type),
        !filters.Location || matchesQuery(item.Location, filters.Location),
      ];

      return (
        divisionMatch &&
        statusMatch &&
        searchMatch &&
        filterConditions.every(Boolean)
      );
    });

    setFilteredData(result);
  }, [data, , searchQuery, status, user, filters]);

  useEffect(() => {
    const fetchTypeList = async () => {
      try {
        const response = await axios.get(url + "service/typelist");
        setTypeList(response.data);
      } catch (error) {
        console.error("Error fetching type list:", error);
      }
    };

    fetchTypeList();
  }, [url]);

  const fetchDocuments = async (serviceID) => {
    try {
      const response = await axios.get(`${url}document/${serviceID}`);

      setPrDocs(response.data.prDocs || []);
      setPoDocs(response.data.poDocs || []);
      setContractDocs(response.data.contractDocs || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleSearchQueryChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      divisionQuery: "",
      totalPriceQuery: "",
      pricePerMonthQuery: "",
      vendorNameQuery: "",
      dateOfIssueFrom: "",
      dateOfIssueTo: "",
      dateOfExpiredFrom: "",
      dateOfExpiredTo: "",
      statusQuery: "",
      priceMin: "",
      priceMax: "",
      deviceQuery: "",
      serialQuery: "",
      contractQuery: "",
      brandQuery: "",
      modelQuery: "",
      typeQuery: "",
      locationQuery: "",
    };
    setFilters(clearedFilters);
    setTempFilters(clearedFilters);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters); // Apply temporary filters
    setShowFilterModal(false); // Close the modal
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-GB", options);
  };

  // Set badge color for Expire Status
  const getStatusVariant = (status) => {
    switch (status) {
      case 1:
        return "success";
      case 2:
        return "warning";
      case 3:
        return "danger";
      case 4:
        return "secondary";
      default:
        return "secondary";
    }
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

  // DataGrid Columns
  const columns = [
    { field: "DeviceName", headerName: "Description", flex: 1, minWidth: 170 },
    { field: "serialNumber", headerName: "S/N", flex: 1, minWidth: 100 },
    { field: "contractNo", headerName: "Contract No.", flex: 1, minWidth: 100 },
    { field: "Brand", headerName: "Brand", flex: 1, minWidth: 100 },
    { field: "Model", headerName: "Model", flex: 1, minWidth: 100 },
    { field: "Type", headerName: "Type", flex: 1, minWidth: 100 },
    { field: "Location", headerName: "Location", flex: 1, minWidth: 100 },
    { field: "divisionName", headerName: "Division", flex: 1, minWidth: 100 },
    {
      field: "price",
      headerName: "Total Price",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const value = parseFloat(params.value);
        return isNaN(value)
          ? "0.00"
          : value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
      },
    },
    {
      field: "vendorName",
      headerName: "Vendor",
      flex: 1,
      minWidth: 100,
    },
    {
      field: "startDate",
      headerName: "Issued Date",
      flex: 1,
      minWidth: 100,
      renderCell: (params) => <span>{formatDate(params.row?.startDate)}</span>,
    },
    {
      field: "endDate",
      headerName: "Expired Date",
      flex: 1,
      minWidth: 100,
      renderCell: (params) => (
        <Badge pill bg={getStatusVariant(params.row?.statusID)} style={{fontSize:"11px"}}>
          <span>{formatDate(params.row?.endDate)}</span>
        </Badge>
      ),
    },
    {
      field: "expireStatusName",
      headerName: "Status",
      flex: 1,
      minWidth: 100,
      renderCell: (params) => {
        const status =
          params.row?.expireStatusName?.toLowerCase() === "expire in 3 months"
            ? "Issued"
            : params.row?.expireStatusName || "N/A";

        return (
          <Badge pill bg={getStatusVariant(params.row?.statusID)} style={{fontSize:"11px"}}>
            {status}
          </Badge>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      flex: 1.5,
      minWidth: 250,
      renderCell: (params) => {
        const isExpired =
          params.row?.expireStatusName?.toLowerCase() === "just expired" ||
          params.row?.expireStatusName?.toLowerCase() === "expired";
          const isReissued = params.row?.reIssueStatus === 1;
        return (
          <div className="d-flex flex-wrap gap-1">
            <Link to={`/document/${params.row?.serviceID}`}>
              <Button size="sm" variant="info">
                View
              </Button>
            </Link>
            <Link>
              <Button
                size="sm"
                variant="warning"
                onClick={() => handleEditClick(params.row)}
                disabled={isExpired}>
                Edit
              </Button>
            </Link>
            <Link>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleReissueClick(params.row)}
                disabled={isReissued}>
                Reissue
              </Button>
            </Link>
            {user.permissionID === 2 && (
              <Link>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDeleteService(params.row.serviceID)}>
                  Delete
                </Button>
              </Link>
            )}
          </div>
        );
      },
    },
  ];

  const handleEditClick = (rowData) => {
    setEditData({ ...rowData });
    fetchDocuments(rowData.serviceID); // Fetch related documents
    setShowEditModal(true);
  };

  const handleReissueClick = (rowData) => {
    console.log("rowData ", rowData);

    setReissueData({ ...rowData });
    setShowReissueModal(true);
  };

  const handleSaveChanges = () => {
    const updatedData = {};
    if (editData.DeviceName) updatedData.DeviceName = editData.DeviceName;
    if (editData.divisionName) updatedData.divisionName = editData.divisionName;
    if (editData.serialNumber) updatedData.serialNumber = editData.serialNumber;
    if (editData.contractNo) updatedData.contractNo = editData.contractNo;
    if (editData.price) updatedData.price = editData.price;
    if (editData.vendorName) updatedData.vendorName = editData.vendorName;
    if (editData.startDate) updatedData.startDate = editData.startDate;
    if (editData.endDate) updatedData.endDate = editData.endDate;
    if (editData.divisionID) updatedData.divisionID = editData.divisionID;
    if (editData.Brand) updatedData.Brand = editData.Brand;
    if (editData.Model) updatedData.Model = editData.Model;
    if (editData.Type) updatedData.Type = editData.Type;
    if (editData.Location) updatedData.Location = editData.Location;
    // Only send the fields that are provided (non-empty)

    axios
      .put(url + `service/updatedata/${editData.serviceID}`, updatedData)
      .then(async (response) => {
        if (uploadedFiles.length > 0) {
          const formDataFile = new FormData();
          uploadedFiles.forEach((file) => {
            formDataFile.append("files", file.file);
          });
          const fileTypes = uploadedFiles.map((file) => file.type);
          formDataFile.append("fileTypes", JSON.stringify(fileTypes));
          formDataFile.append("serviceID", editData.serviceID);

          await axios.post(url + "service/insertdoc", formDataFile);
        }
        setShowEditModal(false);
        setUploadedFiles([]);
        fetchData();
        alert("Data updated successfully");
      })
      .catch((error) => {
        console.error("Error updating data:", error);
        alert("Failed to update data. Please try again.");
      });
  };

  const handleReissueSave = async () => {
    try {
      const updatedData = {
        DeviceName: reissueData.DeviceName,
        serialNumber: reissueData.serialNumber,
        contractNo: reissueData.contractNo,
        price: reissueData.price,
        vendorName: reissueData.vendorName,
        startDate: reissueData.startDate,
        endDate: reissueData.endDate,
        divisionID: reissueData.divisionID,
        Brand: reissueData.Brand,
        Model: reissueData.Model,
        Type: reissueData.Type,
        Location: reissueData.Location,
      };

      const response = await axios.post(
        url + "service/insertdata",
        updatedData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const newServiceID = response.data.serviceID;

      if (!newServiceID) {
        alert("Failed to create service. Please try again.");
        return;
      }

      try {
        await axios.post(url + "reIssue", {
          oldServiceID: reissueData.serviceID,
          newServiceID: newServiceID,
        });
      } catch (error) {
        if (error.response && error.response.status === 444) {
          alert("Cannot reissue: Service is already reissued!");
          return;
        }
        alert("Failed to log reissue relation.");
        return;
      }

      if (uploadedFiles.length > 0) {
        const formDataFile = new FormData();
        uploadedFiles.forEach((file) => {
          formDataFile.append("files", file.file);
        });
        const fileTypes = uploadedFiles.map((file) => file.type);
        formDataFile.append("fileTypes", JSON.stringify(fileTypes));
        formDataFile.append("serviceID", newServiceID);

        await axios.post(url + "service/insertdoc", formDataFile);
      }

      alert("Reissue completed successfully!");
      setShowReissueModal(false);
      setUploadedFiles([]);
      fetchData(); // Refresh grid
    } catch (error) {
      console.error("Error during reissue:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleDeleteService = async (serviceID) => {
    if (!window.confirm("Are you sure you want to delete this Issue?")) return;
    try {
      await axios.delete(url + `service/deletedata/${serviceID}`);
      fetchData(); // Refresh data after delete
      alert("Issue deleted successfully.");
    } catch (err) {
      alert("Failed to delete issue. Please try again.");
    }
  };

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 50,
    page: 0,
  });

  return (
    <div className="container p-1">
      <h2>
        Reissue -{" "}
        {status === "1" ? "Issued" : status === "2" ? "Expire Issues" : ""}
      </h2>

      {/* Search Bar */}
      <div className="row mt-3">
        <div className="col-md-4"></div>
        <div className="col-md-4">
          <InputGroup className="mb-3">
            <FormControl
              placeholder=""
              value={searchQuery}
              onChange={handleSearchQueryChange}
            />
          </InputGroup>
        </div>
        <div className="col-md-4">
          <Button
            variant="info"
            className="text-center"
            size="md"
            onClick={() => setShowFilterModal(true)}>
            Filter
          </Button>
        </div>
      </div>

      {/* DataGrid */}
      <div
        className="mt-3"
        style={{
          height: "calc(100vh - 150px)",
          width: "100%",
          overflowX: "auto",
          maxWidth: "100vw",
        }}>
        <DataGrid
          sx={{
            "& .MuiDataGrid-root": { width: "100%", minWidth: "700px" },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f8f9fa",
              fontSize: "14px",
            },
            "& .MuiDataGrid-cell": {
              fontSize: "12px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
            "& .MuiDataGrid-footerContainer": { justifyContent: "center" },
          }}
          rows={filteredData.length > 0 ? filteredData : []}
          columns={columns}
          getRowId={(row) => row.serviceID ?? row.serialNumber ?? row.id}
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[50, 100]}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        size="lg"
        show={showEditModal}
        onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Service</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editData && (
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="formDeviceName">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      type="text"
                      value={editData.DeviceName}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          DeviceName: e.target.value,
                        })
                      }
                      disabled
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="divisionName">
                    <Form.Label>Division</Form.Label>
                    <Form.Control
                      type="text"
                      value={editData.divisionName}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          divisionName: e.target.value,
                        })
                      }
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="formSerialNumber">
                    <Form.Label>S/N</Form.Label>
                    <Form.Control
                      type="text"
                      value={editData.serialNumber}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          serialNumber: e.target.value,
                        })
                      }
                      disabled
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formContractNo">
                    <Form.Label>Contract No.</Form.Label>
                    <Form.Control
                      type="text"
                      value={editData.contractNo}
                      onChange={(e) =>
                        setEditData({ ...editData, contractNo: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="formBrand">
                    <Form.Label>Brand</Form.Label>
                    <Form.Control
                      type="text"
                      value={editData.Brand}
                      onChange={(e) =>
                        setEditData({ ...editData, Brand: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formModel">
                    <Form.Label>Model</Form.Label>
                    <Form.Control
                      type="text"
                      value={editData.Model}
                      onChange={(e) =>
                        setEditData({ ...editData, Model: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="formType">
                    <Form.Label>Type</Form.Label>
                    <Form.Select
                      value={editData.Type || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, Type: e.target.value })
                      }>
                      <option value=""></option>
                      {typeList.map((type) => (
                        <option key={type.TypeId} value={type.TypeName}>
                          {type.TypeName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formLocation">
                    <Form.Label>Location</Form.Label>
                    <Form.Control
                      type="text"
                      value={editData.Location}
                      onChange={(e) =>
                        setEditData({ ...editData, Location: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="formPrice">
                    <Form.Label>Total Price</Form.Label>
                    <Form.Control
                      type="text"
                      value={editData.price}
                      onChange={(e) =>
                        setEditData({ ...editData, price: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formVendorName">
                    <Form.Label>Vendor Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={editData.vendorName}
                      onChange={(e) =>
                        setEditData({ ...editData, vendorName: e.target.value })
                      }
                      list="vendorOption"
                    />
                    <datalist id="vendorOption">
                      {vendorAll.map((item, index) => (
                        <option value={item.vendor_name} />
                      ))}
                    </datalist>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group controlId="formStartDate">
                    <Form.Label>Issued Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={editData.startDate?.split("T")[0]} // Adjust for date format
                      onChange={(e) =>
                        setEditData({ ...editData, startDate: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formEndDate">
                    <Form.Label>Expired Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={editData.endDate?.split("T")[0]} // Adjust for date format
                      onChange={(e) =>
                        setEditData({ ...editData, endDate: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* File Upload Section */}
              <Row className="mt-3">
                <Col md={4}>
                  <Form.Control
                    type="file"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </Col>
                <Col md={4}>
                  <Form.Select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}>
                    <option value="">---Select Type---</option>
                    <option value="contract">Contract</option>
                    <option value="pr">PR</option>
                    <option value="po">PO</option>
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Button
                    variant="success"
                    onClick={handleUpload}
                    type="button"
                    disabled={!selectedFile || !fileType}>
                    Upload
                  </Button>
                </Col>
              </Row>

              {uploadedFiles.length > 0 && (
                <div className="mt-3">
                  <Table bordered>
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
                  </Table>
                </div>
              )}

              {/* Document Tabs Section */}
              <Row className="mt-4">
                <Col>
                  <Tabs className="mb-3">
                    <Tab
                      eventKey="pr"
                      title="PR"
                      tabClassName={
                        prDocs.length > 0 ? "bg-primary" : "bg-secondary"
                      }
                      className="border-top border-bottom border-secondary border-2">
                      {prDocs.length > 0 ? (
                        <ul>
                          {prDocs.map((doc, index) => (
                            <li key={index}>
                              <a
                                style={{ cursor: "pointer" }}
                                onClick={() => openFile(doc.DocName)}
                                target="_blank"
                                rel="noopener noreferrer">
                                {doc.DocName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No PR documents available.</p>
                      )}
                    </Tab>

                    <Tab
                      eventKey="po"
                      title="PO"
                      tabClassName={
                        poDocs.length > 0 ? "bg-primary" : "bg-secondary"
                      }
                      className="border-top border-bottom border-secondary border-2">
                      {poDocs.length > 0 ? (
                        <ul>
                          {poDocs.map((doc, index) => (
                            <li key={index}>
                              <a
                                style={{ cursor: "pointer" }}
                                onClick={() => openFile(doc.DocName)}
                                target="_blank"
                                rel="noopener noreferrer">
                                {doc.DocName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No PO documents available.</p>
                      )}
                    </Tab>

                    <Tab
                      eventKey="contract"
                      title="Contract"
                      tabClassName={
                        contractDocs.length > 0 ? "bg-primary" : "bg-secondary"
                      }
                      className="border-top border-bottom border-secondary border-2">
                      {contractDocs.length > 0 ? (
                        <ul>
                          {contractDocs.map((doc, index) => (
                            <li key={index}>
                              <a
                                style={{ cursor: "pointer" }}
                                onClick={() => openFile(doc.DocName)}
                                target="_blank"
                                rel="noopener noreferrer">
                                {doc.DocName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No Contract documents available.</p>
                      )}
                    </Tab>
                  </Tabs>
                </Col>
              </Row>
              <Row className="text-center mt-2">
                <Button variant="success" onClick={handleSaveChanges}>
                  Save Changes
                </Button>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => setShowEditModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reissue Modal */}
      <Modal
        size="lg"
        show={showReissueModal}
        onHide={() => setShowReissueModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reissue Device</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {reissueData && (
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="formDeviceName">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      type="text"
                      value={reissueData.DeviceName}
                      disabled
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formDivisionName">
                    <Form.Label>Division Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={reissueData.divisionName}
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="formSerialNumber">
                    <Form.Label>S/N</Form.Label>
                    <Form.Control
                      type="text"
                      value={reissueData.serialNumber}
                      disabled
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formContractNo">
                    <Form.Label>Contract No.</Form.Label>
                    <Form.Control
                      type="text"
                      value={reissueData.contractNo}
                      onChange={(e) =>
                        setReissueData({
                          ...reissueData,
                          contractNo: e.target.value,
                        })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formBrand">
                    <Form.Label>Brand</Form.Label>
                    <Form.Control
                      type="text"
                      value={reissueData.Brand}
                      onChange={(e) =>
                        setReissueData({
                          ...reissueData,
                          Brand: e.target.value,
                        })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formModel">
                    <Form.Label>Model</Form.Label>
                    <Form.Control
                      type="text"
                      value={reissueData.Model}
                      onChange={(e) =>
                        setReissueData({
                          ...reissueData,
                          Modal: e.target.value,
                        })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="formType">
                    <Form.Label>Type</Form.Label>
                    <Form.Select
                      value={reissueData.Type || ""}
                      onChange={(e) =>
                        setReissueData({ ...reissueData, Type: e.target.value })
                      }>
                      <option value="">Select Type</option>
                      {typeList.map((type) => (
                        <option key={type.TypeId} value={type.TypeName}>
                          {type.TypeName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formLocation">
                    <Form.Label>Location</Form.Label>
                    <Form.Control
                      type="text"
                      value={reissueData.Location}
                      onChange={(e) =>
                        setReissueData({
                          ...reissueData,
                          Location: e.target.value,
                        })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group controlId="formPrice">
                    <Form.Label>Total Price</Form.Label>
                    <Form.Control
                      type="text"
                      value={reissueData.price}
                      onChange={(e) =>
                        setReissueData({
                          ...reissueData,
                          price: e.target.value,
                        })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formVendorName">
                    <Form.Label>Vendor Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={reissueData.vendorName}
                      onChange={(e) =>
                        setReissueData({
                          ...reissueData,
                          vendorName: e.target.value,
                        })
                      }
                      list="vendorOption"
                    />
                    <datalist id="vendorOption">
                      {vendorAll.map((item, index) => (
                        <option value={item.vendor_name} />
                      ))}
                    </datalist>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group controlId="formStartDate">
                    <Form.Label>Issued Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={reissueData.startDate?.split("T")[0] || ""}
                      onChange={(e) =>
                        setReissueData({
                          ...reissueData,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="formEndDate">
                    <Form.Label>Expired Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={reissueData.endDate?.split("T")[0] || ""}
                      onChange={(e) =>
                        setReissueData({
                          ...reissueData,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* File Upload Section */}
              <Row className="mt-3">
                <Col md={4}>
                  <Form.Control
                    type="file"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </Col>
                <Col md={4}>
                  <Form.Select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}>
                    <option value="">---Select Type---</option>
                    <option value="contract">Contract</option>
                    <option value="pr">PR</option>
                    <option value="po">PO</option>
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Button
                    variant="success"
                    onClick={handleUpload}
                    type="button"
                    disabled={!selectedFile || !fileType}>
                    Upload
                  </Button>
                </Col>
              </Row>

              {/* File List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3">
                  <Table bordered>
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
                  </Table>
                </div>
              )}
              <Row>
                <Col className="text-center mt-2">
                  <Button variant="success" onClick={handleReissueSave}>
                    Reissue
                  </Button>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => setShowReissueModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Filter Modal */}
      <Modal
        show={showFilterModal}
        onHide={() => setShowFilterModal(false)}
        size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Filter Options</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="px-3 mt-3">
              <Col md={6} className="mb-3">
                <FormLabel>Description</FormLabel>
                <FormControl
                  value={tempFilters.deviceQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      deviceQuery: e.target.value,
                    })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>S/N</FormLabel>
                <FormControl
                  value={tempFilters.serialQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      serialQuery: e.target.value,
                    })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>Contract No.</FormLabel>
                <FormControl
                  value={tempFilters.contractQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      contractQuery: e.target.value,
                    })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>Brand</FormLabel>
                <FormControl
                  placeholder="Brand"
                  value={tempFilters.brandQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      brandQuery: e.target.value,
                    })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>Modal</FormLabel>
                <FormControl
                  placeholder="Model"
                  value={tempFilters.modelQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      modelQuery: e.target.value,
                    })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>Type</FormLabel>
                <Form.Select
                  value={tempFilters.typeQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      typeQuery: e.target.value,
                    })
                  }>
                  <option value="">Select Type</option>
                  {typeList.map((type) => (
                    <option key={type.TypeId} value={type.TypeName}>
                      {type.TypeName}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>Location</FormLabel>
                <FormControl
                  value={tempFilters.locationQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      locationQuery: e.target.value,
                    })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>Total Price</FormLabel>
                <FormControl
                  value={tempFilters.totalPriceQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      totalPriceQuery: e.target.value,
                    })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>Min Price</FormLabel>
                <FormControl
                  type="number"
                  value={tempFilters.priceMin}
                  onChange={(e) =>
                    setTempFilters({ ...tempFilters, priceMin: e.target.value })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>Max Price</FormLabel>
                <FormControl
                  type="number"
                  value={tempFilters.priceMax}
                  onChange={(e) =>
                    setTempFilters({ ...tempFilters, priceMax: e.target.value })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <FormLabel>Vendor</FormLabel>
                <FormControl
                  value={tempFilters.vendorNameQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      vendorNameQuery: e.target.value,
                    })
                  }
                />
              </Col>
              <Col md={6} className="mb-3" />
              <Col md={6} className="mb-3">
                <FormGroup>
                  <FormLabel>Date of Issue (From)</FormLabel>
                  <FormControl
                    type="month"
                    placeholder="Date of Issue"
                    value={tempFilters.dateOfIssueFrom}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        dateOfIssueFrom: e.target.value,
                      })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md={6} className="mb-3">
                <FormGroup>
                  <FormLabel>Date of Issue (To)</FormLabel>
                  <FormControl
                    type="month"
                    placeholder="Date of Issue"
                    value={tempFilters.dateOfIssueTo}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        dateOfIssueTo: e.target.value,
                      })
                    }
                  />
                </FormGroup>
              </Col>

              <Col md={6} className="mb-3">
                <FormGroup>
                  <FormLabel>Date of Expired (From)</FormLabel>
                  <FormControl
                    type="month"
                    placeholder="Date of Expired"
                    value={tempFilters.dateOfExpiredFrom}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        dateOfExpiredFrom: e.target.value,
                      })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md={6} className="mb-3">
                <FormGroup>
                  <FormLabel>Date of Expired (To)</FormLabel>
                  <FormControl
                    type="month"
                    placeholder="Date of Expired"
                    value={tempFilters.dateOfExpiredTo}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        dateOfExpiredTo: e.target.value,
                      })
                    }
                  />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col className="text-center">
                <Button variant="success" onClick={handleApplyFilters}>
                  Search
                </Button>
                <Button
                  variant="outline-warning"
                  className="ms-2"
                  onClick={handleClearFilters}>
                  Clear
                </Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => setShowFilterModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
