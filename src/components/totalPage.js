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
import { Button, Table, Modal } from "react-bootstrap";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { UserContext } from "../context/UserProvider";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TotalPage() {
  const { url } = useContext(UrlContext);
  const { user } = useContext(UserContext);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [filteredData, setFilteredData] = useState([]);
  const [serviceDetails, setServiceDetails] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [fromYear, setFromYear] = useState(today.getFullYear());
  const [toYear, setToYear] = useState(today.getFullYear());

  const isAdmin = user.permissionID === 2 || user.permissionID === 3;

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(0, i).toLocaleString("en-US", { month: "short" })
      ),
    []
  );

  const handlePrevYear = () => setYear((prev) => prev - 1);
  const handleNextYear = () => setYear((prev) => prev + 1);

  // Fetch and group services
  const fetchData = useCallback(() => {
    axios
      .get(url + "service")
      .then((res) => {
        const grouped = {};
        const services = res.data.filter(
          (item) => item.divisionID === user.divisionID
        );

        services.forEach((item) => {
          const start = new Date(item.startDate);
          const end = new Date(item.endDate);

          // Skip services outside the selected year
          if (start.getFullYear() > year || end.getFullYear() < year) return;

          const groupKey = `${item.DeviceName}_${item.Location}_${item.serialNumber}`;

          // Initialize group if needed
          if (!grouped[groupKey]) {
            grouped[groupKey] = {
              ...item,
              startDate: item.startDate,
              endDate: item.endDate,
              serviceID: item.serviceID,
              serviceIDs: [item.serviceID],
              divisionName: item.divisionName,
            };
          } else {
            grouped[groupKey].serviceIDs.push(item.serviceID);

            const currentStart = new Date(grouped[groupKey].startDate);
            const currentEnd = new Date(grouped[groupKey].endDate);
            const newStart = new Date(item.startDate);
            const newEnd = new Date(item.endDate);

            // Update to latest dates
            if (newStart > currentStart) {
              grouped[groupKey].startDate = item.startDate;
              grouped[groupKey].serviceID = item.serviceID;
            }
            if (newEnd > currentEnd) {
              grouped[groupKey].endDate = item.endDate;
              grouped[groupKey].serviceID = item.serviceID;
            }
          }
        });

        setFilteredData(Object.values(grouped));
      })
      .catch((err) => console.error("Failed to fetch:", err));
  }, [url, year, user.divisionID]);

  // Fetch ServiceDetail for each grouped serviceID
  useEffect(() => {
    if (filteredData.length === 0) return;
    filteredData.forEach((row) => {
      row.serviceIDs.forEach((id) => {
        if (!serviceDetails[id]) {
          axios
            .get(`${url}service/detail/${id}`)
            .then((res) => {
              setServiceDetails((prev) => ({
                ...prev,
                [id]: res.data,
              }));
            })
            .catch(() => {
              console.error(`Failed to fetch details for serviceID: ${id}`);
            });
        }
      });
    });
    // eslint-disable-next-line
  }, [filteredData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportToExcelInRange = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      fromYear === toYear ? `Total ${fromYear}` : `Total ${fromYear}-${toYear}`
    );
    // worksheet.views = [
    //   { state: "frozen", xSplit: 1, ySplit: 3 }, // freeze column A and top 3 rows
    // ];

    // Prepare full month-year list
    const monthYearList = [];
    for (let year = fromYear; year <= toYear; year++) {
      for (let month = 0; month < 12; month++) {
        monthYearList.push({ year, month });
      }
    }

    // Create title row
    const titleText =
      fromYear === toYear
        ? `Service Total for Year ${fromYear}`
        : `Service Total from ${fromYear} – ${toYear}`;
    const totalColumns = 1 + monthYearList.length + 1; // Description + months + Total
    worksheet.mergeCells(1, 1, 1, totalColumns);
    const titleCell = worksheet.getCell("A1");
    titleCell.value = titleText;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Add a blank spacer row (row 2)
    worksheet.addRow([]);

    // Build the header row
    const header = [
      "Description",
      ...monthYearList.map(({ year, month }) =>
        new Date(year, month).toLocaleString("default", {
          month: "short",
          year: "numeric",
        })
      ),
      "Total",
    ];
    worksheet.addRow(header);
    worksheet.getRow(1).font = { bold: true };

    // Data rows per device
    filteredData.forEach((row) => {
      const dataRow = [row.DeviceName];
      let total = 0;

      monthYearList.forEach(({ year, month }) => {
        const details = row.serviceIDs.flatMap(
          (id) => serviceDetails[id] || []
        );
        const chargeDetail = details.find((d) => {
          const dDate = new Date(d.charge_date);
          return dDate.getFullYear() === year && dDate.getMonth() === month;
        });
        if (chargeDetail) {
          const value = Number(chargeDetail.monthly_charge);
          dataRow.push(value);
          total += value;
        } else {
          dataRow.push("-");
        }
      });

      dataRow.push(total);
      const addedRow = worksheet.addRow(dataRow);

      // Style cells
      addedRow.eachCell((cell, colIndex) => {
        const val = cell.value;
        if (typeof val === "number") {
          cell.numFmt = '"฿"#,##0.00';
        }
        if (val === "On Warranty") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFC000" }, // Light yellow
          };
        }
      });
    });

    // Total row (bottom)
    const totalRow = ["Total"];
    let grandTotal = 0;

    monthYearList.forEach(({ year, month }, index) => {
      let colTotal = 0;
      filteredData.forEach((row) => {
        const details = row.serviceIDs.flatMap(
          (id) => serviceDetails[id] || []
        );
        const chargeDetail = details.find((d) => {
          const dDate = new Date(d.charge_date);
          return dDate.getFullYear() === year && dDate.getMonth() === month;
        });
        if (chargeDetail) {
          const value = Number(chargeDetail.monthly_charge);
          colTotal += value;
        }
      });
      totalRow.push(colTotal > 0 ? colTotal : "-");
      if (typeof colTotal === "number") grandTotal += colTotal;
    });

    totalRow.push(grandTotal);
    const totalRowAdded = worksheet.addRow(totalRow);
    totalRowAdded.font = { bold: true };
    totalRowAdded.eachCell((cell) => {
      if (typeof cell.value === "number") {
        cell.numFmt = '"฿"#,##0.00';
      }
    });

    // Auto width
    worksheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? cell.value.toString() : "";
        maxLen = Math.max(maxLen, val.length);
      });
      col.width = maxLen + 2;
    });

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer]),
      fromYear === toYear
        ? `Service_Total_${fromYear}.xlsx`
        : `Service_Total_${fromYear}-${toYear}.xlsx`
    );
  };

  return (
    <div className="container p-1">
      <h4>Total cost per year in {year}</h4>

      <div className="d-flex justify-content-between align-items-center my-3">
        <Button variant="light" onClick={handlePrevYear}>
          &lt;&lt; Previous year
        </Button>
        <Button variant="light" onClick={handleNextYear}>
          Next year &gt;&gt;
        </Button>
      </div>

      <div
        className="mt-3"
        style={{
          overflowX: "auto",
          maxHeight: "600px",
          position: "relative",
        }}>
        <Table striped bordered hover size="lg">
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "center",
                  minWidth: "200px",
                  position: "sticky",
                  left: 0,
                  top: 0,
                  background: "#fff",
                  zIndex: 3,
                }}>
                Description
              </th>
              <th
                style={{
                  textAlign: "center",
                  background: "#fff",
                  zIndex: 2,
                  position: "sticky",
                  top: 0,
                }}>
                Division
              </th>
              <th
                style={{
                  textAlign: "center",
                  position: "sticky",
                  left: 200,
                  top: 0,
                  background: "#fff",
                  zIndex: 2,
                }}>
                View
              </th>
              {monthNames.map((month, i) => (
                <th
                  style={{
                    textAlign: "center",
                    minWidth: "100px",
                    position: "sticky",
                    zIndex: 1,
                    top: 0,
                  }}
                  key={i}>
                  {month}
                </th>
              ))}
              <th
                style={{
                  textAlign: "center",
                  position: "sticky",
                  zIndex: 1,
                  top: 0,
                }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              <>
                {filteredData.map((row) => {
                  const details = row.serviceIDs.flatMap(
                    (id) => serviceDetails[id] || []
                  );
                  let rowTotal = 0;
                  return (
                    <tr key={row.serviceID}>
                      <td
                        className="text-start"
                        style={{
                          position: "sticky",
                          left: 0,
                          background: "#fff",
                          zIndex: 1,
                        }}>
                        {row.DeviceName} {row.serialNumber}
                        {`(${row.Location})`}
                        <br />
                        {`(${formatDate(row.startDate)}-${formatDate(
                          row.endDate
                        )})`}
                      </td>
                      <td>{row.divisionName}</td>
                      <td
                        style={{
                          position: "sticky",
                          left: 200,
                          background: "#fff",
                          zIndex: 1,
                        }}>
                        <Link to={`/service/document/${row.serviceID}`}>
                          <Button variant="info" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                      {monthNames.map((month, i) => {
                        const chargeDetail = details.find((d) => {
                          const dDate = new Date(d.charge_date);
                          return (
                            dDate.getFullYear() === year &&
                            dDate.getMonth() === i
                          );
                        });
                        let cellValue = "-";
                        if (chargeDetail) {
                          cellValue = Number(
                            chargeDetail.monthly_charge
                          ).toLocaleString("th-TH", {
                            style: "currency",
                            currency: "THB",
                          });
                          rowTotal += Number(chargeDetail.monthly_charge);
                        }
                        return (
                          <td key={i} className="text-center">
                            {cellValue}
                          </td>
                        );
                      })}
                      <td
                        className="text-center"
                        style={{
                          fontWeight: "bold",
                        }}>
                        {rowTotal > 0
                          ? rowTotal.toLocaleString("th-TH", {
                              style: "currency",
                              currency: "THB",
                            })
                          : "-"}
                      </td>
                    </tr>
                  );
                })}

                {/* Monthly Totals Row */}
                <tr className="text-center" style={{ fontWeight: "bold" }}>
                  <td
                    colSpan={3}
                    style={{
                      position: "sticky",
                      left: 0,
                      backgroundColor: "#fff",
                      zIndex: 2,
                    }}>
                    Total
                  </td>
                  {monthNames.map((month, i) => {
                    let monthlyTotal = 0;
                    filteredData.forEach((row) => {
                      const details = row.serviceIDs.flatMap(
                        (id) => serviceDetails[id] || []
                      );
                      const chargeDetail = details.find((d) => {
                        const dDate = new Date(d.charge_date);
                        return (
                          dDate.getFullYear() === year && dDate.getMonth() === i
                        );
                      });
                      if (chargeDetail) {
                        monthlyTotal += Number(chargeDetail.monthly_charge);
                      }
                    });
                    return (
                      <td key={i}>
                        {monthlyTotal > 0
                          ? monthlyTotal.toLocaleString("th-TH", {
                              style: "currency",
                              currency: "THB",
                            })
                          : "-"}
                      </td>
                    );
                  })}
                  {/* Overall Yearly Total */}
                  <td>
                    {filteredData
                      .reduce((total, row) => {
                        const details = row.serviceIDs.flatMap(
                          (id) => serviceDetails[id] || []
                        );
                        return (
                          total +
                          details.reduce(
                            (s, d) => s + Number(d.monthly_charge || 0),
                            0
                          )
                        );
                      }, 0)
                      .toLocaleString("th-TH", {
                        style: "currency",
                        currency: "THB",
                      })}
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={17} className="text-center">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="d-flex justify-content-center mt-3">
        <Button variant="success" onClick={() => setShowExportModal(true)}>
          Export
        </Button>
      </div>

      <Modal
        size="lg"
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        centered>
        <Modal.Header closeButton>
          <Modal.Title>Export Data to Excel</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-center gap-2 mb-4">
            <label>From:</label>
            <select
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}>
              {Array.from(
                { length: 10 },
                (_, i) => today.getFullYear() - 5 + i
              ).map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <label>To:</label>
            <select
              value={toYear}
              onChange={(e) => setToYear(Number(e.target.value))}>
              {Array.from(
                { length: 10 },
                (_, i) => today.getFullYear() - 5 + i
              ).map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          <div className="d-flex justify-content-center">
            <Button
              variant="success"
              onClick={() => {
                exportToExcelInRange();
                setShowExportModal(false);
              }}>
              Export
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
