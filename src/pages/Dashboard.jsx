import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getDocuments, addDocument, updateDocument, deleteDocument, getProjects } from '../services/dataService';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Select from 'react-select';
import { Download, Plus, Search, Edit, Trash2, X } from 'lucide-react';

const COMMON_DOCS = [
  "Hợp đồng",
  "Đề nghị tạm ứng",
  "Đề nghị thanh toán",
  "Bảng xác nhận khối lượng",
  "Biên bản nghiệm thu",
  "Đề nghị thanh toán đợt 1",
  "Đề nghị thanh toán đợt 2",
  "Đề nghị thanh toán đợt 3",
  "Hồ sơ quyết toán",
  "Bảng khối lượng và giá trị quyết toán",
  "Đề nghị quyết toán"
];

const STATUS_OPTIONS = [
  { value: "Chưa ký", label: "Chưa ký", class: "badge-pending" },
  { value: "1 dấu", label: "1 dấu", class: "badge-signed-1" },
  { value: "Đủ 2 dấu", label: "Đủ 2 dấu", class: "badge-signed-2" },
];

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  
  const [formData, setFormData] = useState({
    projectId: '',
    documents: [],
    dateSent: new Date().toISOString().split('T')[0],
    sender: '',
    receiver: '',
    receiverInfo: '',
    dateReceived: '',
    status: 'Chưa ký',
    customStatus: '',
    isScanned: false,
    storageLocation: ''
  });
  
  // Custom Doc Input
  const [docInput, setDocInput] = useState('');

  // Filters
  const [filterCompany, setFilterCompany] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docsData, projsData] = await Promise.all([getDocuments(), getProjects()]);
      // Sort docs by newest first (assuming createdAt exists or sorting by dateSent)
      const sortedDocs = docsData.sort((a, b) => new Date(b.dateSent) - new Date(a.dateSent));
      setDocuments(sortedDocs);
      setProjects(projsData);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (e) => {
    const pId = e.target.value;
    const project = projects.find(p => p.id === pId);
    
    if (project) {
      setFormData({
        ...formData,
        projectId: pId,
        receiver: project.defaultReceiver || ''
      });
    } else {
      setFormData({ ...formData, projectId: pId });
    }
  };

  const toggleDocName = (name) => {
    const existing = formData.documents.find(d => d.name === name);
    if (existing) {
      setFormData({
        ...formData,
        documents: formData.documents.filter(d => d.name !== name)
      });
    } else {
      setFormData({
        ...formData,
        documents: [...formData.documents, { name, quantity: 1 }]
      });
    }
  };

  const updateDocQuantity = (name, quantity) => {
    setFormData({
      ...formData,
      documents: formData.documents.map(d => 
        d.name === name ? { ...d, quantity: Math.max(1, parseInt(quantity) || 1) } : d
      )
    });
  };

  const handleAddCustomDoc = () => {
    const name = docInput.trim();
    if (name && !formData.documents.some(d => d.name === name)) {
      setFormData({
        ...formData,
        documents: [...formData.documents, { name, quantity: 1 }]
      });
      setDocInput('');
    }
  };

  const openNewModal = () => {
    setEditingDoc(null);
    setFormData({
      projectId: '',
      documents: [],
      dateSent: new Date().toISOString().split('T')[0],
      sender: '',
      receiver: '',
      receiverInfo: '',
      dateReceived: '',
      status: 'Chưa ký',
      customStatus: '',
      isScanned: false,
      storageLocation: ''
    });
    setDocInput('');
    setShowModal(true);
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    let docsData = [];
    if (doc.documents) {
      docsData = doc.documents;
    } else if (doc.documentNames) {
      docsData = doc.documentNames.map(n => ({ name: n, quantity: 1 }));
    }

    setFormData({
      ...doc,
      documents: docsData,
      customStatus: STATUS_OPTIONS.some(opt => opt.value === doc.status) ? '' : doc.status,
      status: STATUS_OPTIONS.some(opt => opt.value === doc.status) ? doc.status : 'Khác'
    });
    setDocInput('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId) {
      toast.error('Vui lòng chọn Dự án');
      return;
    }
    if (formData.documents.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 hồ sơ gửi');
      return;
    }

    const finalStatus = formData.status === 'Khác' ? formData.customStatus : formData.status;
    const submitData = { ...formData, status: finalStatus };
    delete submitData.customStatus;

    try {
      if (editingDoc) {
        await updateDocument(editingDoc.id, submitData);
        toast.success('Đã cập nhật hồ sơ');
      } else {
        await addDocument(submitData);
        toast.success('Đã tạo phiếu giao nhận mới');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error('Lỗi khi lưu dữ liệu');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa phiếu này?')) {
      try {
        await deleteDocument(id);
        toast.success('Đã xóa phiếu');
        loadData();
      } catch (error) {
        toast.error('Lỗi khi xóa');
      }
    }
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GiaoNhanHoSo');

    worksheet.columns = [
      { header: 'Công ty', key: 'company', width: 15 },
      { header: 'Dự án', key: 'project', width: 30 },
      { header: 'Khách hàng', key: 'customer', width: 30 },
      { header: 'Số hợp đồng', key: 'contract', width: 20 },
      { header: 'Hồ sơ gửi', key: 'docs', width: 45 },
      { header: 'Ngày gửi', key: 'dateSent', width: 15 },
      { header: 'Người gửi', key: 'sender', width: 20 },
      { header: 'Người nhận', key: 'receiver', width: 20 },
      { header: 'Thông tin người nhận', key: 'receiverInfo', width: 30 },
      { header: 'Ngày nhận', key: 'dateReceived', width: 15 },
      { header: 'Tình trạng', key: 'status', width: 15 },
      { header: 'Đã scan', key: 'scanned', width: 10 },
      { header: 'Vị trí lưu', key: 'location', width: 20 }
    ];

    // Style Header Row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' } // Indigo color
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add Data
    filteredDocuments.forEach(doc => {
      const p = projects.find(proj => proj.id === doc.projectId) || {};
      
      let docsStr = '';
      if (doc.documents) {
        docsStr = doc.documents.map(d => `- ${d.name} (SL: ${d.quantity})`).join('\n');
      } else if (doc.documentNames) {
        docsStr = doc.documentNames.map(d => `- ${d}`).join('\n');
      }

      const row = worksheet.addRow({
        company: p.company === 'hireeco' ? 'Hiree Co' : 'Hiree JSC',
        project: p.projectName,
        customer: p.customerName,
        contract: p.contractNumber,
        docs: docsStr,
        dateSent: doc.dateSent,
        sender: doc.sender,
        receiver: doc.receiver,
        receiverInfo: doc.receiverInfo,
        dateReceived: doc.dateReceived,
        status: doc.status,
        scanned: doc.isScanned ? 'Rồi' : 'Chưa',
        location: doc.storageLocation
      });

      // Format cells in row
      row.getCell('docs').alignment = { wrapText: true, vertical: 'top' };
      row.eachCell((cell, colNumber) => {
        if (colNumber !== 5) { // column 5 is docs
          cell.alignment = { vertical: 'top' };
        }
        // Add borders to all cells
        cell.border = {
          top: {style:'thin', color: {argb:'FFDDDDDD'}},
          left: {style:'thin', color: {argb:'FFDDDDDD'}},
          bottom: {style:'thin', color: {argb:'FFDDDDDD'}},
          right: {style:'thin', color: {argb:'FFDDDDDD'}}
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, "DanhSachGiaoNhanHoSo.xlsx");
  };

  const filteredDocuments = documents.filter(doc => {
    const p = projects.find(proj => proj.id === doc.projectId);
    if (!p) return false;
    
    // Filter Company
    if (filterCompany && p.company !== filterCompany) return false;
    
    // Filter Search (Project, Customer, Contract)
    if (filterSearch) {
      const term = filterSearch.toLowerCase();
      const matchProject = p.projectName?.toLowerCase().includes(term);
      const matchCustomer = p.customerName?.toLowerCase().includes(term);
      const matchContract = p.contractNumber?.toLowerCase().includes(term);
      if (!matchProject && !matchCustomer && !matchContract) return false;
    }
    
    return true;
  });

  const getStatusBadgeClass = (status) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return opt ? opt.class : 'badge-custom';
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem', overflow: 'visible' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
            <label className="form-label">Tìm kiếm (Dự án, Khách hàng, HĐ)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Nhập từ khóa..." 
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '0.8rem', color: 'var(--text-muted)' }} />
            </div>
          </div>
          <div className="form-group" style={{ margin: 0, width: '200px' }}>
            <label className="form-label">Lọc theo Công ty</label>
            <select 
              className="form-control"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="hireeco">Hiree Co</option>
              <option value="hireejsc">Hiree JSC</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={exportExcel}>
            <Download size={18} /> Xuất Excel
          </button>
          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={18} /> Tạo Phiếu Giao Nhận
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Dự án / Khách hàng</th>
                  <th>Hồ sơ gửi</th>
                  <th>Giao nhận</th>
                  <th>Tình trạng</th>
                  <th>Lưu trữ</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Đang tải dữ liệu...</td></tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '4rem' }}>
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary-hover)', display: 'inline-block', padding: '1rem 2rem', borderRadius: 'var(--radius-lg)', fontWeight: 500 }}>
                        🚀 Chưa có phiếu giao nhận nào. Hãy bấm "Tạo Phiếu Giao Nhận" ở góc trên để bắt đầu!
                      </div>
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '4rem' }}>
                      <div style={{ background: '#fee2e2', color: '#ef4444', display: 'inline-block', padding: '1rem 2rem', borderRadius: 'var(--radius-lg)', fontWeight: 500 }}>
                        🔍 Không tìm thấy phiếu giao nhận nào phù hợp với từ khóa/bộ lọc của bạn.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map(doc => {
                    const p = projects.find(proj => proj.id === doc.projectId) || {};
                    return (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{p.projectName}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{p.customerName}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>HĐ: {p.contractNumber}</div>
                          <span className={`badge ${p.company === 'hireeco' ? 'badge-signed-1' : 'badge-pending'}`} style={{ marginTop: '0.5rem' }}>
                            {p.company === 'hireeco' ? 'Hiree Co' : 'Hiree JSC'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {doc.documents ? doc.documents.map((d, i) => (
                              <span key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                • {d.name} <span style={{ color: 'var(--primary)', fontWeight: 600 }}>(SL: {d.quantity})</span>
                              </span>
                            )) : doc.documentNames?.map((name, i) => (
                              <span key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                • {name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.9rem' }}>
                          <div style={{ marginBottom: '0.25rem' }}><span style={{ color: 'var(--text-muted)' }}>Gửi:</span> {doc.dateSent} <br/><span style={{ fontSize: '0.8rem' }}>({doc.sender})</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Nhận:</span> {doc.dateReceived || '...'} <br/><span style={{ fontSize: '0.8rem' }}>({doc.receiver})</span></div>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(doc.status)}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.9rem' }}>
                          <div style={{ marginBottom: '0.25rem' }}><span style={{ color: 'var(--text-muted)' }}>Scan:</span> {doc.isScanned ? '✅ Đã scan' : '⏳ Chưa'}</div>
                          {doc.storageLocation && <div><span style={{ color: 'var(--text-muted)' }}>Vị trí:</span> {doc.storageLocation}</div>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => openEditModal(doc)} className="close-btn" style={{ color: 'var(--primary)' }} title="Chỉnh sửa">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(doc.id)} className="close-btn" style={{ color: '#ef4444' }} title="Xóa">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>{editingDoc ? 'Cập nhật Phiếu' : 'Tạo Phiếu Giao Nhận Mới'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <form id="docForm" onSubmit={handleSubmit}>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>1. Thông tin Dự án</h4>
                <div className="form-group">
                  <label className="form-label">Chọn Dự án</label>
                  <Select
                    isDisabled={!!editingDoc}
                    options={projects.map(p => ({
                      value: p.id,
                      label: `[${p.company === 'hireeco' ? 'HireeCo' : 'HireeJSC'}] ${p.projectName} - ${p.customerName} - HĐ: ${p.contractNumber}`
                    }))}
                    value={formData.projectId ? (() => {
                      const p = projects.find(proj => proj.id === formData.projectId);
                      return p ? {
                        value: p.id,
                        label: `[${p.company === 'hireeco' ? 'HireeCo' : 'HireeJSC'}] ${p.projectName} - ${p.customerName} - HĐ: ${p.contractNumber}`
                      } : null;
                    })() : null}
                    onChange={(selectedOption) => {
                      handleProjectSelect({ target: { value: selectedOption ? selectedOption.value : '' } });
                    }}
                    placeholder="-- Gõ để tìm kiếm dự án... --"
                    isClearable
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: 'var(--border)',
                        padding: '0.15rem',
                        borderRadius: 'var(--radius-md)'
                      })
                    }}
                  />
                </div>

                {formData.projectId && (() => {
                  const p = projects.find(proj => proj.id === formData.projectId);
                  return p ? (
                    <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid var(--border)' }}>
                      <div style={{ marginBottom: '0.25rem' }}><strong style={{ color: 'var(--text-muted)' }}>Khách hàng:</strong> {p.customerName}</div>
                      <div><strong style={{ color: 'var(--text-muted)' }}>Hợp đồng:</strong> {p.contractNumber}</div>
                    </div>
                  ) : null;
                })()}

                <h4 style={{ fontSize: '1.05rem', color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '1rem' }}>2. Thông tin Hồ sơ</h4>
                
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '0.75rem' }}>Đánh dấu các hồ sơ sẽ gửi & số lượng:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    {COMMON_DOCS.map((doc, idx) => {
                      const docObj = formData.documents.find(d => d.name === doc);
                      const isSelected = !!docObj;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            transition: 'all 0.2s',
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: editingDoc ? 'not-allowed' : 'pointer', flex: 1, margin: 0, opacity: editingDoc ? 0.7 : 1 }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              disabled={!!editingDoc}
                              onChange={() => toggleDocName(doc)}
                              style={{ width: '1.1rem', height: '1.1rem', cursor: editingDoc ? 'not-allowed' : 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: isSelected ? 'var(--primary-hover)' : 'var(--text-main)', fontWeight: isSelected ? 500 : 400 }}>{doc}</span>
                          </label>
                          {isSelected && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SL:</span>
                              <input 
                                type="number" 
                                min="1" 
                                value={docObj.quantity} 
                                disabled={!!editingDoc}
                                onChange={(e) => updateDocQuantity(doc, e.target.value)}
                                style={{ width: '35px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', background: 'transparent' }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <label className="form-label">Hoặc thêm hồ sơ loại khác:</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Gõ tên hồ sơ khác..."
                      value={docInput}
                      disabled={!!editingDoc}
                      onChange={(e) => setDocInput(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddCustomDoc(); } }}
                    />
                    <button type="button" className="btn btn-secondary" disabled={!!editingDoc} onClick={handleAddCustomDoc}>Thêm</button>
                  </div>
                  
                  {formData.documents.filter(d => !COMMON_DOCS.includes(d.name)).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Các hồ sơ khác đã thêm:</div>
                      {formData.documents.filter(d => !COMMON_DOCS.includes(d.name)).map((d, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{d.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Số lượng:</span>
                              <input 
                                type="number" 
                                min="1" 
                                value={d.quantity} 
                                disabled={!!editingDoc}
                                onChange={(e) => updateDocQuantity(d.name, e.target.value)}
                                style={{ width: '40px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.1rem 0.3rem', textAlign: 'center', fontSize: '0.85rem', background: editingDoc ? 'transparent' : 'white' }}
                              />
                            </div>
                            {!editingDoc && <X size={16} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => toggleDocName(d.name)} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Ngày gửi</label>
                    <input type="date" className="form-control" name="dateSent" value={formData.dateSent} disabled={!!editingDoc} onChange={(e) => setFormData({...formData, dateSent: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Người gửi</label>
                    <input type="text" className="form-control" value={formData.sender} disabled={!!editingDoc} onChange={(e) => setFormData({...formData, sender: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Người nhận</label>
                    <input type="text" className="form-control" value={formData.receiver} disabled={!!editingDoc} onChange={(e) => setFormData({...formData, receiver: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SĐT / Email nhận</label>
                    <input type="text" className="form-control" value={formData.receiverInfo} disabled={!!editingDoc} onChange={(e) => setFormData({...formData, receiverInfo: e.target.value})} />
                  </div>
                </div>

                <h4 style={{ fontSize: '1.05rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '1rem' }}>3. Tình trạng Nhận & Lưu trữ</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Ngày nhận</label>
                    <input type="date" className="form-control" value={formData.dateReceived} onChange={(e) => setFormData({...formData, dateReceived: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tình trạng hồ sơ</label>
                    <select className="form-control" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      <option value="Khác">Trạng thái khác (Tự nhập)...</option>
                    </select>
                    {formData.status === 'Khác' && (
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ marginTop: '0.75rem' }} 
                        placeholder="Nhập trạng thái..." 
                        value={formData.customStatus}
                        onChange={(e) => setFormData({...formData, customStatus: e.target.value})}
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        name="isScanned" 
                        checked={formData.isScanned}
                        onChange={(e) => setFormData({ ...formData, isScanned: e.target.checked })}
                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }}
                      />
                      Đã scan file
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vị trí lưu bản cứng</label>
                    <input type="text" className="form-control" placeholder="Ví dụ: Tủ A, Ngăn 3" value={formData.storageLocation} onChange={(e) => setFormData({...formData, storageLocation: e.target.value})} />
                  </div>
                </div>

              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button type="submit" form="docForm" className="btn btn-primary">
                {editingDoc ? 'Lưu thay đổi' : 'Tạo Phiếu Giao Nhận'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
