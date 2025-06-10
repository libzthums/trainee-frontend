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

export default function TexPage() {
  const { url } = useContext(UrlContext);
  const { user } = useContext(UserContext);

  const [showExportModal, setShowExportModal] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [serviceDetails, setServiceDetails] = useState({});
  const [startYear, setStartYear] = useState(2023);
  const [endYear, setEndYear] = useState(2025);

  const today = new Date();
  const [fromYear, setFromYear] = useState(today.getFullYear());
  const [toYear, setToYear] = useState(today.getFullYear());

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(0, i).toLocaleString("en-US", { month: "short" })
      ),
    []
  );

  // Grouping logic (same as before)
  const fetchData = useCallback(() => {
    axios
      .get(url + "service")
      .then((res) => {
        const grouped = {};
        const services = res.data.filter(
          (item) => item.divisionID === user.divisionID
        );

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

        services.forEach((item) => {
          const groupKey = `${item.DeviceName}_${item.Location}_${item.serialNumber}`;
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
  }, [url, user.divisionID]);

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

  const monthRange = useMemo(() => {
    const months = [];
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 0; m < 12; m++) {
        months.push({ year: y, month: m });
      }
    }
    return months;
  }, [startYear, endYear]);

  // Export logic (uses serviceDetails)
  const exportToExcelInRange = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      fromYear === toYear ? `Total ${fromYear}` : `Total ${fromYear}-${toYear}`
    );

    const monthYearList = [];
    for (let year = fromYear; year <= toYear; year++) {
      for (let month = 0; month < 12; month++) {
        monthYearList.push({ year, month });
      }
    }

    const titleText =
      fromYear === toYear
        ? `Service Total for Year ${fromYear}`
        : `Service Total from ${fromYear} – ${toYear}`;
    const totalColumns = 1 + monthYearList.length + 1;
    worksheet.mergeCells(1, 1, 1, totalColumns);
    const titleCell = worksheet.getCell("A1");
    titleCell.value = titleText;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.addRow([]);

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

    filteredData.forEach((row) => {
      const details = row.serviceIDs.flatMap((id) => serviceDetails[id] || []);
      const dataRow = [row.DeviceName];
      let total = 0;

      monthYearList.forEach(({ year, month }) => {
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

      addedRow.eachCell((cell, colIndex) => {
        const val = cell.value;
        if (typeof val === "number") {
          cell.numFmt = '"฿"#,##0.00';
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
          colTotal += Number(chargeDetail.monthly_charge);
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

    worksheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? cell.value.toString() : "";
        maxLen = Math.max(maxLen, val.length);
      });
      col.width = maxLen + 2;
    });

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
      <h4>
        Total cost from Jan {startYear} to Dec {endYear}
      </h4>

      <div
        className="mt-3"
        style={{
          overflowX: "auto",
          maxHeight: "600px",
          position: "relative",
        }}>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "center",
                  minWidth: "250px",
                  position: "sticky",
                  left: 0,
                  top: 0,
                  backgroundColor: "#fff",
                  zIndex: 3,
                }}>
                Description
              </th>
              <th
                style={{
                  textAlign: "center",
                  minWidth: "100px",
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
                  minWidth: "70px",
                  position: "sticky",
                  left: "250px",
                  top: 0,
                  backgroundColor: "#fff",
                  zIndex: 3,
                }}>
                View
              </th>
              {monthRange.map(({ year, month }) => (
                <th
                  key={`${year}-${month}`}
                  style={{
                    textAlign: "center",
                    minWidth: "100px",
                    position: "sticky",
                    zIndex: 1,
                    top: 0,
                  }}>
                  {monthNames[month]} {year}
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
                  let total = 0;
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
                        {row.DeviceName} {row.serialNumber}
                        {`(${row.Location})`}
                        <br />
                        {`(${formatDate(row.startDate)}-${formatDate(
                          row.endDate
                        )})`}
                      </td>
                      <td style={{ minWidth: "100px" }}>{row.divisionName}</td>
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
                        const chargeDetail = details.find((d) => {
                          const dDate = new Date(d.charge_date);
                          return (
                            dDate.getFullYear() === year &&
                            dDate.getMonth() === month
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
                          total += Number(chargeDetail.monthly_charge);
                        }
                        return (
                          <td key={`${year}-${month}`} className="text-center">
                            {cellValue}
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
                    colSpan={3}
                    style={{
                      position: "sticky",
                      left: 0,
                      backgroundColor: "#fff",
                      zIndex: 2,
                    }}>
                    Total
                  </td>
                  {monthRange.map(({ year, month }) => {
                    let total = 0;
                    filteredData.forEach((row) => {
                      const details = row.serviceIDs.flatMap(
                        (id) => serviceDetails[id] || []
                      );
                      const chargeDetail = details.find((d) => {
                        const dDate = new Date(d.charge_date);
                        return (
                          dDate.getFullYear() === year &&
                          dDate.getMonth() === month
                        );
                      });
                      if (chargeDetail) {
                        total += Number(chargeDetail.monthly_charge);
                      }
                    });
                    return (
                      <td key={`${year}-${month}`}>
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
                        const details = row.serviceIDs.flatMap(
                          (id) => serviceDetails[id] || []
                        );
                        return (
                          sum +
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
                <td colSpan={monthRange.length + 3} className="text-center">
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
