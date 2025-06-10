import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import { UrlContext } from "../router/route";
import { Link } from "react-router-dom";
import {
  Button,
  Badge,
  InputGroup,
  FormControl,
  Modal,
  Form,
  Col,
  Row,
  FormGroup,
  FormLabel,
} from "react-bootstrap";
import { DataGrid } from "@mui/x-data-grid";
import { UserContext } from "../context/UserProvider";
// import { useUser } from "../context/userContext";

export default function Main() {
  const { url } = useContext(UrlContext);
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const {user}=useContext(UserContext)
  // const { user, activeDivision } = useUser();

  const [showFilterModal, setShowFilterModal] = useState(false);

  const [filters, setFilters] = useState({
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
  });

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

  const [tempFilters, setTempFilters] = useState({ ...filters });
  const [typeList, setTypeList] = useState([]);

  const expireStatusOptions = [
    { label: "All Status", value: "" },
    { label: "Issued", value: "issued" },
    { label: "Expire in 3 months", value: "expire in 3 months" },
    { label: "Just Expired", value: "just expired" },
    { label: "Expired", value: "expired" },
  ];

  const fetchData = useCallback(() => {
    axios
      .get(url + "service")
      .then(async (response) => {
        const services = response.data;

        //console.log("services ",services);
        
        // Fetch document indicators for each service
        const updatedServices = await Promise.all(
          services.map(async (service) => {
            try {
              const docResponse = await axios.get(
                `${url}document/${service.serviceID}`
              );
             // console.log("docResponse ",docResponse);
            //  console.log("service ",service);
              
              return {
                ...service,
                hasPR: docResponse.data.hasPR,
                hasPO: docResponse.data.hasPO,
                hasContract: docResponse.data.hasContract,
              };
            } catch (error) {
              if (error.response && error.response.status === 404) {
                // Expected: No documents for this service, so just return service without logging
                return service;
              }

              // Unexpected error, log it
              console.error(
                `Unexpected error for serviceID ${service.serviceID}:`,
                error.message
              );
              return service;
            }
          })
        );

        setData(updatedServices);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        alert("Failed to fetch data. Please try again later.");
      });
  }, [url]);

  // const fetchData = async()=>{

  // }

  const filterData = useCallback(() => {
    //console.log("filterData ",user.permissionID);
    
    //  if (!user.divisionID) return [];

    let visibleData =
      user.permissionID === 2 
        ? data
        : data.filter((item) => item.divisionID === user.divisionID);

    return visibleData.filter((item) => {

      const matchesQuery = (field, query) =>
        (field ?? "")
          .toString()
          .toLowerCase()
          .trim()
          .includes(query.toLowerCase().trim());

      const matchesPriceRange = (price) => {
        const min = filters.priceMin ? parseFloat(filters.priceMin) : -Infinity;
        const max = filters.priceMax ? parseFloat(filters.priceMax) : Infinity;
        return price >= min && price <= max;
      };

      const isWithinMonthRange = (rowDate, from, to) => {
        if (!rowDate) return false;
        const rowMonth = rowDate.slice(0, 7); // "YYYY-MM"
        if (from && rowMonth < from) return false;
        if (to && rowMonth > to) return false;
        return true;
      };

      return (
        (!searchQuery ||
          matchesQuery(item.DeviceName, searchQuery) ||
          matchesQuery(item.serialNumber, searchQuery) ||
          matchesQuery(item.contractNo, searchQuery) ||
          matchesQuery(item.vendorName, searchQuery) ||
          matchesQuery(item.Location, searchQuery) ||
          matchesQuery(item.Type, searchQuery) ||
          matchesQuery(item.Brand, searchQuery) ||
          matchesQuery(item.Model, searchQuery)) &&
        (!filters.deviceQuery ||
          matchesQuery(item.DeviceName, filters.deviceQuery)) &&
        (!filters.serialQuery ||
          matchesQuery(item.serialNumber, filters.serialQuery)) &&
        (!filters.contractQuery ||
          matchesQuery(item.contractNo, filters.contractQuery)) &&
        (!filters.divisionQuery ||
          matchesQuery(item.divisionName, filters.divisionQuery)) &&
        (!filters.totalPriceQuery ||
          item.price?.toString().includes(filters.totalPriceQuery)) &&
        (!filters.pricePerMonthQuery ||
          item.monthly_charge
            ?.toString()
            .includes(filters.pricePerMonthQuery)) &&
        (!filters.vendorNameQuery ||
          matchesQuery(item.vendorName, filters.vendorNameQuery)) &&
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
        (!filters.statusQuery ||
          item.expireStatusName?.toLowerCase() ===
            filters.statusQuery.toLowerCase()) &&
        matchesPriceRange(parseFloat(item.price)) &&
        (!filters.brandQuery || matchesQuery(item.Brand, filters.brandQuery)) &&
        (!filters.modelQuery || matchesQuery(item.Model, filters.modelQuery)) &&
        (!filters.typeQuery || matchesQuery(item.Type, filters.typeQuery)) &&
        (!filters.locationQuery ||
          matchesQuery(item.Location, filters.locationQuery))
      );
    });
  }, [data,  searchQuery, user, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

 const filteredData = useMemo(() => filterData(), [filterData]);

  const handleSearchQueryChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "issued":
        return "success";
      case "expire in 3 months":
        return "warning";
      case "just expired":
        return "danger";
      case "expired":
        return "dark";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-GB", options);
  };

  const columns = [
    { field: "DeviceName", headerName: "Description", flex: 1, minWidth: 170 },
    { field: "serialNumber", headerName: "S/N", flex: 1, minWidth: 120 },
    {
      field: "contractNo",
      headerName: "Contract No.",
      flex: 1,
      minWidth: 120,
    },
    { field: "Brand", headerName: "Brand", flex: 1, minWidth: 120 },
    { field: "Model", headerName: "Model", flex: 1, minWidth: 120 },
    { field: "Type", headerName: "Type", flex: 1, minWidth: 120 },
    { field: "Location", headerName: "Location", flex: 1, minWidth: 120 },
    { field: "divisionName", headerName: "Division", flex: 1, minWidth: 120 },
    { field: "price", headerName: "Total Price", flex: 1, minWidth: 120 },
    {
      field: "monthly_charge",
      headerName: "Price/Month",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const value = parseFloat(params.value);
        return isNaN(value) ? "0.00" : value.toFixed(2);
      },
    },
    { field: "vendorName", headerName: "Vendor", flex: 1, minWidth: 120 },
    {
      field: "startDate",
      headerName: "Date of Issue",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => <span>{formatDate(params.row?.startDate)}</span>,
    },
    {
      field: "endDate",
      headerName: "Date of Expired",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => <span>{formatDate(params.row?.endDate)}</span>,
    },
    {
      field: "expireStatusName",
      headerName: "Status",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Badge pill bg={getStatusVariant(params.row?.expireStatusName)}>
          {params.row?.expireStatusName || "N/A"}
        </Badge>
      ),
    },
    {
      field: "actions",
      headerName: "",
      flex: 1,
      minWidth: 80,
      renderCell: (params) => (
        <Link to={`/service/document/${params.row?.serviceID}`}>
          <Button variant="primary">View</Button>
        </Link>
      ),
    },
    {
      field: "showdot",
      headerName: "",
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}>
          {/* PR */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              title="PR"
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: params.row?.hasPR ? "#198754" : "#dc3545",
              }}
            />
            <span style={{ fontSize: "12px" }}>PR</span>
          </div>

          {/* PO */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              title="PO"
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: params.row?.hasPO ? "#198754" : "#dc3545",
              }}
            />
            <span style={{ fontSize: "12px" }}>PO</span>
          </div>

          {/* Contract */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              title="Contract"
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: params.row?.hasContract
                  ? "#198754"
                  : "#dc3545",
              }}
            />
            <span style={{ fontSize: "12px" }}>Contract</span>
          </div>
        </div>
      ),
    },
  ];

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 50,
    page: 0,
  });

  return (
    <div className="container p-1">
      <h2>Service</h2>
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
          rows={filteredData}
          columns={columns}
          getRowId={(row) => row.serviceID ?? row.serialNumber ?? row.id}
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[50, 100]}
        />
      </div>

      <Modal
        show={showFilterModal}
        onHide={() => setShowFilterModal(false)}
        size="lg"
        centered>
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
                <FormLabel>Model</FormLabel>
                <FormControl
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
                  placeholder="Vendor"
                  value={tempFilters.vendorNameQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      vendorNameQuery: e.target.value,
                    })
                  }
                />
              </Col>

              <Col md={6} className="mb-3">
                <FormLabel>Status</FormLabel>
                <Form.Select
                  value={tempFilters.statusQuery}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      statusQuery: e.target.value,
                    })
                  }>
                  {expireStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>

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
