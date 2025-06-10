import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import axios from "axios";
import { UrlContext } from "../router/route";

export default function DocDetail() {
  const { serviceID } = useParams();
  const navigate = useNavigate();
  const { url } = useContext(UrlContext);

  const [prDocs, setPrDocs] = useState([]);
  const [poDocs, setPoDocs] = useState([]);
  const [contractDocs, setContractDocs] = useState([]);

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

  const handleDeleteDocument = async (docName, area) => {
    if (!window.confirm(`Delete document "${docName}"?`)) return;
    try {
      await axios.delete(
        `${url}document/${serviceID}/${encodeURIComponent(docName)}`
      );
      // Remove from UI
      if (area === "pr")
        setPrDocs((docs) => docs.filter((doc) => doc.DocName !== docName));
      else if (area === "po")
        setPoDocs((docs) => docs.filter((doc) => doc.DocName !== docName));
      else if (area === "contract")
        setContractDocs((docs) =>
          docs.filter((doc) => doc.DocName !== docName)
        );
      alert("Document deleted successfully.");
    } catch (error) {
      alert("Failed to delete document.");
    }
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await axios.get(`${url}document/${serviceID}`);
        setPrDocs(response.data.prDocs || []);
        setPoDocs(response.data.poDocs || []);
        setContractDocs(response.data.contractDocs || []);
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };

    fetchDocuments();
  }, [serviceID, url]);

  let defaultTab = "pr";
  if (prDocs.length > 0) {
    defaultTab = "pr";
  } else if (poDocs.length > 0) {
    defaultTab = "po";
  } else if (contractDocs.length > 0) {
    defaultTab = "contract";
  }

  return (
    <div className="p-1 container">
      <Button variant="secondary" onClick={() => navigate(-1)}>
        <i className="fas fa-arrow-left"></i> Back
      </Button>
      <h2 className="mt-4 mb-4 text-2xl font-semibold">Document</h2>

      <Tabs defaultActiveKey={defaultTab} className="mb-3">
        <Tab
          eventKey="pr"
          title="PR"
          tabClassName={prDocs.length > 0 ? "bg-primary" : "bg-secondary"}
          className="border-top border-bottom border-secondary border-2">
          {prDocs.length > 0 ? (
            <ul>
              {prDocs.map((doc, index) => (
                <li key={index}>
                  <a
                    // href={encodeURI(doc.DocPath)}
                    //  href={url+"doc/"+doc.DocName}
                    style={{ cursor: "pointer" }}
                    onClick={() => openFile(doc.DocName)}
                    target="_blank"
                    rel="noopener noreferrer">
                    {doc.DocName}
                  </a>
                  <Button
                    variant="danger"
                    size="sm"
                    className="ms-2"
                    onClick={() => handleDeleteDocument(doc.DocName, "pr")}>
                    Delete
                  </Button>
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
          tabClassName={poDocs.length > 0 ? "bg-primary" : "bg-secondary"}
          className="border-top border-bottom border-secondary border-2">
          {poDocs.length > 0 ? (
            <ul>
              {poDocs.map((doc, index) => (
                <li key={index}>
                  <a
                    // href={encodeURI(doc.DocPath)}
                    //href={url+"doc/"+doc.DocName}
                    style={{ cursor: "pointer" }}
                    onClick={() => openFile(doc.DocName)}
                    target="_blank"
                    rel="noopener noreferrer">
                    {doc.DocName}
                  </a>
                  <Button
                    variant="danger"
                    size="sm"
                    className="ms-2"
                    onClick={() => handleDeleteDocument(doc.DocName, "po")}>
                    Delete
                  </Button>
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
          tabClassName={contractDocs.length > 0 ? "bg-primary" : "bg-secondary"}
          className="border-top border-bottom border-secondary border-2">
          {contractDocs.length > 0 ? (
            <ul>
              {contractDocs.map((doc, index) => (
                <li key={index}>
                  <a
                    // href={encodeURI(doc.DocPath)}
                    // href={url+"doc/"+doc.DocName}
                    style={{ cursor: "pointer" }}
                    onClick={() => openFile(doc.DocName)}
                    target="_blank"
                    rel="noopener noreferrer">
                    {doc.DocName}
                  </a>
                  <Button
                    variant="danger"
                    size="sm"
                    className="ms-2"
                    onClick={() =>
                      handleDeleteDocument(doc.DocName, "contract")
                    }>
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No Contract documents available.</p>
          )}
        </Tab>
      </Tabs>
    </div>
  );
}
