import { useState, useEffect } from 'react';
import { getProjects, addProject, updateProject, deleteProject, addProjectsBatch, deleteProjectsBatch } from '../services/dataService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Upload, Plus, Trash2, Edit, Search, X } from 'lucide-react';

export default function MasterData() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    company: 'hireeco',
    projectName: '',
    customerName: '',
    contractNumber: '',
    defaultReceiver: '',
    storageLocation: '',
    note: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectName || !formData.customerName) {
      toast.error('Vui lòng nhập Tên dự án và Khách hàng');
      return;
    }
    
    try {
      if (editingId) {
        await updateProject(editingId, formData);
        toast.success('Đã cập nhật dữ liệu gốc');
        setEditingId(null);
      } else {
        await addProject(formData);
        toast.success('Đã thêm dữ liệu gốc');
      }
      
      setFormData({
        company: 'hireeco',
        projectName: '',
        customerName: '',
        contractNumber: '',
        defaultReceiver: '',
        storageLocation: '',
        note: ''
      });
      loadProjects();
    } catch (error) {
      toast.error('Lỗi khi lưu dữ liệu');
    }
  };

  const handleEdit = (project) => {
    setEditingId(project.id);
    setFormData({
      company: project.company || 'hireeco',
      projectName: project.projectName || '',
      customerName: project.customerName || '',
      contractNumber: project.contractNumber || '',
      defaultReceiver: project.defaultReceiver || '',
      storageLocation: project.storageLocation || '',
      note: project.note || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      company: 'hireeco',
      projectName: '',
      customerName: '',
      contractNumber: '',
      defaultReceiver: '',
      storageLocation: '',
      note: ''
    });
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa?')) {
      try {
        await deleteProject(id);
        toast.success('Đã xóa dữ liệu');
        setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        loadProjects();
      } catch (error) {
        toast.error('Lỗi khi xóa dữ liệu');
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === projects.length && projects.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map(p => p.id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dữ liệu đã chọn?`)) {
      try {
        await deleteProjectsBatch(selectedIds);
        toast.success(`Đã xóa ${selectedIds.length} dữ liệu`);
        setSelectedIds([]);
        loadProjects();
      } catch (error) {
        toast.error('Lỗi khi xóa dữ liệu');
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        // Chuẩn hóa tên cột: viết thường, bỏ dấu tiếng việt, bỏ khoảng trắng
        const normalizeKey = (key) => {
          return key ? key.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, '') : '';
        };

        const parsedProjects = rawData.map(row => {
          const normalizedRow = {};
          for (const key in row) {
            normalizedRow[normalizeKey(key)] = typeof row[key] === 'string' ? row[key].trim() : row[key];
          }
          
          let companyValue = normalizedRow['congty'] ? String(normalizedRow['congty']).toLowerCase() : '';
          let companyCode = companyValue.includes('jsc') ? 'hireejsc' : 'hireeco';

          return {
            company: companyCode,
            projectName: String(normalizedRow['duan'] || normalizedRow['tenduan'] || ''),
            customerName: String(normalizedRow['khachhang'] || normalizedRow['tenkhachhang'] || ''),
            contractNumber: String(normalizedRow['sohopdong'] || normalizedRow['sohd'] || normalizedRow['hd'] || ''),
            defaultReceiver: String(normalizedRow['nguoinhan'] || ''),
            storageLocation: String(normalizedRow['noiluutru'] || normalizedRow['biahoso'] || normalizedRow['vitri'] || ''),
            note: String(normalizedRow['ghichu'] || '')
          };
        }).filter(p => p.projectName && p.customerName); // Chỉ lấy dòng có dữ liệu Dự án và Khách hàng

        if (parsedProjects.length === 0) {
          toast.error('Không tìm thấy dữ liệu hợp lệ. Đảm bảo file có cột: "Dự án" và "Khách hàng"');
          return;
        }

        await addProjectsBatch(parsedProjects);
        toast.success(`Đã import ${parsedProjects.length} bản ghi`);
        loadProjects();
      } catch (error) {
        console.error(error);
        toast.error('Lỗi khi đọc file Excel');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset file input
  };

  const filteredProjects = projects.filter(p => 
    String(p.projectName || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
    String(p.customerName || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
    String(p.contractNumber || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
    String(p.defaultReceiver || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
    String(p.storageLocation || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
    String(p.note || '').toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }} className="master-data-layout">
      <div className="card sticky-form">
        <div className="card-header">
          <h2>{editingId ? 'Cập nhật Dữ liệu gốc' : 'Thêm Dữ liệu gốc'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Công ty</label>
              <select 
                className="form-control" 
                name="company" 
                value={formData.company} 
                onChange={handleInputChange}
              >
                <option value="hireeco">Hiree Co</option>
                <option value="hireejsc">Hiree JSC</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tên dự án</label>
              <input 
                type="text" 
                className="form-control" 
                name="projectName" 
                value={formData.projectName} 
                onChange={handleInputChange} 
                placeholder="Ví dụ: Tòa nhà A" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Khách hàng</label>
              <input 
                type="text" 
                className="form-control" 
                name="customerName" 
                value={formData.customerName} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Số hợp đồng</label>
              <input 
                type="text" 
                className="form-control" 
                name="contractNumber" 
                value={formData.contractNumber} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Người nhận (mặc định)</label>
              <input 
                type="text" 
                className="form-control" 
                name="defaultReceiver" 
                value={formData.defaultReceiver} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nơi lưu trữ (Bìa hồ sơ)</label>
              <input 
                type="text" 
                className="form-control" 
                name="storageLocation" 
                value={formData.storageLocation} 
                onChange={handleInputChange} 
                placeholder="VD: Bìa còng 1..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú (Hồ sơ thiếu...)</label>
              <textarea 
                className="form-control" 
                name="note" 
                rows="2"
                value={formData.note} 
                onChange={handleInputChange} 
                placeholder="Nhập ghi chú nếu có..."
              ></textarea>
            </div>
            
            {editingId ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Cập nhật
                </button>
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Hủy
                </button>
              </div>
            ) : (
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Plus size={16} /> Thêm dữ liệu
              </button>
            )}
          </form>

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border)' }} />
          
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Hoặc import từ file Excel (.xlsx)
              <br/>
              (Cột: Công ty, Dự án, Khách hàng, Số hợp đồng, Người nhận, Nơi lưu trữ)
            </p>
            <label className="btn btn-secondary" style={{ width: '100%', cursor: 'pointer' }}>
              <Upload size={16} /> Import Excel
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'visible' }}>
        <div className="card-header sticky-filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#f8fafc', borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)', zIndex: 30 }}>
          <h2 style={{ margin: 0 }}>Danh sách Dữ liệu gốc ({filteredProjects.length})</h2>
          
          <div style={{ display: 'flex', gap: '1rem', flex: 1, justifyContent: 'flex-end', minWidth: '200px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '350px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm kiếm dự án, người nhận..." 
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '0.8rem', color: 'var(--text-muted)' }} />
            </div>

            {selectedIds.length > 0 && (
              <button 
                className="btn" 
                style={{ background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem' }} 
                onClick={handleDeleteSelected}
              >
                <Trash2 size={16} /> Xóa {selectedIds.length} mục
              </button>
            )}
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={filteredProjects.length > 0 && selectedIds.length === filteredProjects.length}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer', width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary)' }}
                    />
                  </th>
                  <th>Công ty</th>
                  <th>Dự án</th>
                  <th>Khách hàng</th>
                  <th>Số hợp đồng</th>
                  <th style={{ minWidth: '120px' }}>Người nhận</th>
                  <th style={{ minWidth: '150px' }}>Ghi chú</th>
                  <th>Nơi lưu trữ</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center' }}>Đang tải...</td></tr>
                ) : filteredProjects.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy dữ liệu</td></tr>
                ) : (
                  filteredProjects.map(p => (
                    <tr key={p.id} style={{ background: selectedIds.includes(p.id) ? 'var(--primary-light)' : (editingId === p.id ? '#eff6ff' : 'transparent') }}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelectOne(p.id)}
                          style={{ cursor: 'pointer', width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary)' }}
                        />
                      </td>
                      <td>
                        <span className={`badge ${p.company === 'hireeco' ? 'badge-signed-1' : 'badge-pending'}`}>
                          {p.company === 'hireeco' ? 'Hiree Co' : 'Hiree JSC'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.projectName}</td>
                      <td>{p.customerName}</td>
                      <td>{p.contractNumber}</td>
                      <td>{p.defaultReceiver}</td>
                      <td style={{ color: '#7c3aed', fontStyle: 'italic', maxWidth: '200px', minWidth: '150px', whiteSpace: 'pre-wrap' }}>{p.note}</td>
                      <td>{p.storageLocation}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleEdit(p)}
                            className="close-btn"
                            title="Sửa"
                            style={{ color: 'var(--primary)' }}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)}
                            className="close-btn"
                            title="Xóa"
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
