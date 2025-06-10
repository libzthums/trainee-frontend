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
// import { useUser } from "../context/userContext";
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

export default function SummaryPage() {
  const { url } = useContext(UrlContext);
  // const { user, activeDivision } = useUser();
  const {user} =useContext(UserContext)

  const [showExportModal, setShowExportModal] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [startYear, setStartYear] = useState(2023);
  const [endYear, setEndYear] = useState(2025);

  const today = new Date();
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

  const fetchData = useCallback(() => {
    axios
      .get(url + "service")
      .then((res) => {
        const grouped = {};
        const services = isAdmin
          ? res.data
          : res.data.filter((item) => item.divisionID === user.divisionID);

        // Determine start and end year based on data
        let minYear = new Date().getFullYear();
        let maxYear = new Date().getFullYear();

        services.forEach((item) => {
          const start = new Date(item.startDate);
          const end = new Date(item.endDate);

          if (start.getFullYear() < minYear) minYear = start.getFullYear();
          if (end.getFullYear() > maxYear) maxYear = end.getFullYear();
        });

        setStartYear(minYear);
        setEndYear(maxYear);

        const monthRange = [];
        for (let y = minYear; y <= maxYear; y++) {
          for (let m = 0; m < 12; m++) {
            monthRange.push({ year: y, month: m });
          }
        }

        services.forEach((item) => {
          const start = new Date(item.startDate);
          const end = new Date(item.endDate);

          if (end.getFullYear() < minYear || start.getFullYear() > maxYear)
            return;

          const groupKey = `${item.DeviceName}_${item.Location}_${item.serialNumber}`;

          if (!grouped[groupKey]) {
            grouped[groupKey] = {
              ...item,
              startDate: item.startDate,
              endDate: item.endDate,
              serviceID: item.serviceID,
              serviceIDs: [item.serviceID],
              monthlyCharges: {},
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

          monthRange.forEach(({ year, month }) => {
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);

            if (monthEnd >= start && monthStart <= end) {
              const key = `${year}-${month}`;
              grouped[groupKey].monthlyCharges[key] =
                (grouped[groupKey].monthlyCharges[key] || 0) +
                Number(item.monthly_charge);
            }
          });
        });

        setFilteredData(Object.values(grouped));
      })
      .catch((err) => console.error("Failed to fetch:", err));
  }, [url, isAdmin, user.divisionID]);

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
        const start = new Date(row.startDate);
        const end = new Date(row.endDate);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        if (monthEnd >= start && monthStart <= end) {
          if (row.warrantyMonths.includes(month)) {
            dataRow.push("On Warranty");
          } else {
            const value = row.monthlyCharges[month];
            if (value > 0) {
              dataRow.push(value);
              total += value;
            } else {
              dataRow.push("-");
            }
          }
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
        const start = new Date(row.startDate);
        const end = new Date(row.endDate);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        if (
          monthEnd >= start &&
          monthStart <= end &&
          !row.warrantyMonths.includes(month)
        ) {
          const value = row.monthlyCharges[month];
          if (value > 0) {
            colTotal += value;
          }
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const monthRange = useMemo(() => {
    const months = [];
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 0; m < 12; m++) {
        months.push({ year: y, month: m });
      }
    }
    return months;
  }, [startYear, endYear]);

  return (
    <div className="container p-1">
      <h4>
        Total cost from Jan {startYear} to Dec {endYear}
      </h4>

      <div className="mt-3">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "center",
                  minWidth: "250px",
                  position: "sticky",
                  left: 0,
                  backgroundColor: "#fff",
                  zIndex: 3,
                }}>
                Description
              </th>
              {isAdmin && (
                <th style={{ textAlign: "center", minWidth: "100px" }}>
                  Division
                </th>
              )}
              <th
                style={{
                  textAlign: "center",
                  minWidth: "70px",
                  position: "sticky",
                  left: "250px",
                  backgroundColor: "#fff",
                  zIndex: 3,
                }}>
                View
              </th>
              {monthRange.map(({ year, month }) => (
                <th
                  key={`${year}-${month}`}
                  style={{ textAlign: "center", minWidth: "100px" }}>
                  {monthNames[month]} {year}
                </th>
              ))}
              <th style={{ textAlign: "center" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              <>
                {filteredData.map((row) => {
                  const total = Object.entries(row.monthlyCharges).reduce(
                    (sum, [, charge]) => sum + charge,
                    0
                  );
                  return (
                    <tr key={row.serviceID}>
                      <td
                        className="text-start"
                        style={{
                          position: "sticky",
                          left: 0,
                          backgroundColor: "#fff",
                          zIndex: 2,
                        }}>
                        {row.DeviceName} {row.serialNumber}{" "}
                        {`(${formatDate(row.startDate)}-${formatDate(
                          row.endDate
                        )})`}
                      </td>

                      {isAdmin && (
                        <td style={{ minWidth: "100px" }}>
                          {row.divisionName}
                        </td>
                      )}

                      <td
                        className="text-start"
                        style={{
                          position: "sticky",
                          left: "250px",
                          backgroundColor: "#fff",
                          zIndex: 2,
                        }}>
                        <Link to={`/service/document/${row.serviceID}`}>
                          <Button variant="info" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                      {monthRange.map(({ year, month }) => {
                        const key = `${year}-${month}`;
                        const charge = row.monthlyCharges[key];
                        const isWarranty =
                          Array.isArray(row.warrantyMonths) &&
                          row.warrantyMonths.includes(month);
                        return (
                          <td
                            key={key}
                            className="text-center"
                            style={
                              isWarranty ? { backgroundColor: "#fff3cd" } : {}
                            }>
                            {isWarranty
                              ? "On Warranty"
                              : charge > 0
                              ? charge.toLocaleString("th-TH", {
                                  style: "currency",
                                  currency: "THB",
                                })
                              : "-"}
                          </td>
                        );
                      })}
                      <td
                        className="text-center"
                        style={{ fontWeight: "bold" }}>
                        {total > 0
                          ? total.toLocaleString("th-TH", {
                              style: "currency",
                              currency: "THB",
                            })
                          : "-"}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr className="text-center" style={{ fontWeight: "bold" }}>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    style={{
                      position: "sticky",
                      left: 0,
                      backgroundColor: "#fff",
                      zIndex: 2,
                    }}>
                    Total
                  </td>
                  {monthRange.map(({ year, month }) => {
                    const key = `${year}-${month}`;
                    const total = filteredData.reduce((sum, row) => {
                      return sum + (row.monthlyCharges[key] || 0);
                    }, 0);
                    return (
                      <td key={key}>
                        {total > 0
                          ? total.toLocaleString("th-TH", {
                              style: "currency",
                              currency: "THB",
                            })
                          : "-"}
                      </td>
                    );
                  })}
                  <td>
                    {filteredData
                      .reduce((sum, row) => {
                        return (
                          sum +
                          Object.values(row.monthlyCharges).reduce(
                            (s, c) => s + c,
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
                <td
                  colSpan={
                    isAdmin ? monthRange.length + 4 : monthRange.length + 3
                  }
                  className="text-center">
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
