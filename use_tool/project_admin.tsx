'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff,
  MapPin,
  Calendar,
  Maximize2,
  DollarSign,
  Image as ImageIcon,
  X,
  Save,
  ArrowUp,
  CheckCircle2,
  Filter
} from 'lucide-react';

// --- Types ---
interface Project {
  id: string;
  title: string;
  category: string;
  location: string;
  duration: string;
  area: string;
  cost: string;
  coverUrl: string;
  imageUrls: string;
  description: string;
  sortOrder: number;
  isPinned: boolean;
  isPublished: boolean;
  updatedAt: string;
}

// --- Mock Data ---
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: '静谧·私宅设计',
    category: '住宅设计',
    location: '上海·滨湖小区',
    duration: '8 个月',
    area: '240',
    cost: '850,000',
    coverUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    imageUrls: '',
    description: '一个极简主义风格的现代住宅，强调自然光线的引入与空间的流动性。',
    sortOrder: 10,
    isPinned: true,
    isPublished: true,
    updatedAt: '2023-10-24'
  },
  {
    id: '2',
    title: '云端·办公空间',
    category: '商业办公',
    location: '北京·CBD核心区',
    duration: '12 个月',
    area: '1200',
    cost: '3,200,000',
    coverUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    imageUrls: '',
    description: '为科技公司打造的开放式办公环境，注重协作与创新氛围。',
    sortOrder: 5,
    isPinned: false,
    isPublished: true,
    updatedAt: '2023-11-02'
  },
  {
    id: '3',
    title: '森·艺术展厅',
    category: '展厅设计',
    location: '杭州·西溪湿地',
    duration: '6 个月',
    area: '500',
    cost: '1,500,000',
    coverUrl: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    imageUrls: '',
    description: '结合自然景观的沉浸式艺术展示空间。',
    sortOrder: 0,
    isPinned: false,
    isPublished: false,
    updatedAt: '2023-11-10'
  }
];

// --- Components ---

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'success' | 'warning' | 'default' | 'outline' }) => {
  const styles = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border border-amber-100",
    outline: "border border-slate-200 text-slate-500"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
};

export default function ProjectAdmin() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Partial<Project>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  // Use useEffect to handle any client-side specific initializations if needed
  // (Currently empty as data is mocked static, but good practice for Next.js hydration safety)
  useEffect(() => {
    // Client-side logic here
  }, []);

  // Form Handling
  const handleEdit = (project: Project) => {
    setCurrentProject({ ...project });
    setIsDrawerOpen(true);
  };

  const handleCreate = () => {
    setCurrentProject({
      title: '',
      category: '',
      location: '',
      duration: '',
      area: '',
      cost: '',
      coverUrl: '',
      imageUrls: '',
      description: '',
      sortOrder: 0,
      isPinned: false,
      isPublished: true,
    });
    setIsDrawerOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentProject.id) {
      // Update
      setProjects(projects.map(p => p.id === currentProject.id ? { ...currentProject as Project, updatedAt: new Date().toISOString().split('T')[0] } : p));
    } else {
      // Create
      const newProject = {
        ...currentProject,
        id: Math.random().toString(36).substr(2, 9),
        updatedAt: new Date().toISOString().split('T')[0]
      } as Project;
      setProjects([newProject, ...projects]);
    }
    setIsDrawerOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个项目吗？')) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  // Filtered Projects
  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">项目管理台</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="搜索项目..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
              />
            </div>
            
            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-slate-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>新建项目</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">全部项目</h2>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{projects.length}</span>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project Grid */}
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className={`group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : ''}`}
            >
              {/* Image Section */}
              <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48 h-32 rounded-xl flex-shrink-0' : 'aspect-[4/3]'}`}>
                {/* Note: Using standard img for portability. Use next/image in production for optimization. */}
                <img 
                  src={project.coverUrl || 'https://via.placeholder.com/800x600?text=No+Image'} 
                  alt={project.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {project.isPublished ? (
                    <Badge variant="success">已发布</Badge>
                  ) : (
                    <Badge variant="warning">草稿</Badge>
                  )}
                  {project.isPinned && (
                    <span className="bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                      <ArrowUp className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <div className={`flex-1 ${viewMode === 'grid' ? 'p-5' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wider">{project.category}</p>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{project.title}</h3>
                    <div className="flex items-center text-slate-500 text-xs gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>{project.location}</span>
                    </div>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-2 py-4 my-2 border-t border-b border-slate-50">
                  <div className="text-center px-2 border-r border-slate-50">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">工期</p>
                    <p className="text-sm font-medium text-slate-700">{project.duration}</p>
                  </div>
                  <div className="text-center px-2 border-r border-slate-50">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">面积</p>
                    <p className="text-sm font-medium text-slate-700">{project.area}m²</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">造价</p>
                    <p className="text-sm font-medium text-slate-700">{project.cost}</p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-slate-400">更新于 {project.updatedAt}</span>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(project)}
                      className="p-2 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors" title="编辑">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(project.id)}
                      className="p-2 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add New Card (Empty State-ish) */}
          <button 
            onClick={handleCreate}
            className={`group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer ${viewMode === 'list' ? 'h-32' : 'aspect-[4/5]'}`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center mb-3 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600">新建项目</p>
          </button>
        </div>
      </main>

      {/* Editor Drawer / Slide-over */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {currentProject.id ? '编辑项目' : '新建项目'}
                </h2>
                <p className="text-sm text-slate-500">填写下方的详细信息以发布到前台</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8">
              <form id="project-form" onSubmit={handleSave} className="space-y-8">
                
                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    基本信息
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">项目标题 <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={currentProject.title}
                        onChange={e => setCurrentProject({...currentProject, title: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                        placeholder="例如：静谧·私宅设计"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
                        <select 
                          value={currentProject.category}
                          onChange={e => setCurrentProject({...currentProject, category: e.target.value})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none"
                        >
                          <option value="">请选择分类</option>
                          <option value="住宅设计">住宅设计</option>
                          <option value="商业办公">商业办公</option>
                          <option value="展厅设计">展厅设计</option>
                          <option value="景观规划">景观规划</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">地点</label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            value={currentProject.location}
                            onChange={e => setCurrentProject({...currentProject, location: e.target.value})}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            placeholder="上海 / 北京..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Specs */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    项目规格
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">工期</label>
                      <div className="relative">
                        <Calendar className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={currentProject.duration}
                          onChange={e => setCurrentProject({...currentProject, duration: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          placeholder="8 个月"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">面积 (m²)</label>
                      <div className="relative">
                        <Maximize2 className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={currentProject.area}
                          onChange={e => setCurrentProject({...currentProject, area: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          placeholder="240"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">造价 (RMB)</label>
                      <div className="relative">
                        <DollarSign className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={currentProject.cost}
                          onChange={e => setCurrentProject({...currentProject, cost: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          placeholder="850,000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Media */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    媒体资源
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">封面图 URL</label>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={currentProject.coverUrl}
                          onChange={e => setCurrentProject({...currentProject, coverUrl: e.target.value})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-mono text-slate-600"
                          placeholder="https://..."
                        />
                        <p className="text-xs text-slate-400 mt-1">推荐尺寸: 1600x1200, 支持 JPG/PNG</p>
                      </div>
                      <div className="w-24 h-16 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {currentProject.coverUrl ? (
                          <img src={currentProject.coverUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                    </div>
                  </div>

                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">项目描述</label>
                    <textarea 
                      rows={4}
                      value={currentProject.description}
                      onChange={e => setCurrentProject({...currentProject, description: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                      placeholder="输入项目的设计理念、背景故事等..."
                    ></textarea>
                  </div>
                </div>

                {/* Section 4: Settings */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    发布设置
                  </h3>
                  
                  <div className="flex items-center gap-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${currentProject.isPublished ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${currentProject.isPublished ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={currentProject.isPublished || false}
                        onChange={e => setCurrentProject({...currentProject, isPublished: e.target.checked})}
                      />
                      <span className="text-sm font-medium text-slate-700">立即发布</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${currentProject.isPinned ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                        {currentProject.isPinned && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={currentProject.isPinned || false}
                        onChange={e => setCurrentProject({...currentProject, isPinned: e.target.checked})}
                      />
                      <span className="text-sm font-medium text-slate-700">置顶项目</span>
                    </label>

                    <div className="flex-1 flex items-center justify-end gap-2">
                        <span className="text-sm text-slate-500">排序权重:</span>
                        <input 
                          type="number" 
                          value={currentProject.sortOrder}
                          onChange={e => setCurrentProject({...currentProject, sortOrder: parseInt(e.target.value)})}
                          className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-center text-sm"
                        />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button 
                type="submit"
                form="project-form"
                className="px-6 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存项目
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}