"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button, Card, Input } from "@/components/ui"
import { Calendar, Clock, Users, AlertCircle, CheckCircle2, XCircle, Plus, X, Edit2, Trash2 } from "lucide-react"
import type { ProjectRow } from "@/lib/types"

type Worker = {
  id: string
  name: string
  role: string
  skills: string[]
  maxConcurrent: number
}

type Task = {
  id: string
  projectId: string
  projectTitle: string
  taskType: string
  estimatedDays: number
  priority: number
  dependencies: string[]
  requiredSkills: string[]
  startDate?: Date
  endDate?: Date
  workerId?: string
  workerName?: string
  status: "pending" | "scheduled" | "conflict"
}

type Schedule = {
  taskId: string
  workerId: string
  workerName: string
  startDate: Date
  endDate: Date
}

type Conflict = {
  type: string
  task1Id: string
  task2Id: string
  workerId?: string
  message: string
}

export default function SmartSchedulingPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]) // 选中的项目ID
  const [workers, setWorkers] = useState<Worker[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)
  const [showWorkerModal, setShowWorkerModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [newWorker, setNewWorker] = useState({ name: "", role: "", skills: [] as string[], maxConcurrent: 1 })
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [workerToDelete, setWorkerToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  // 当选中项目变化时，重新生成任务
  useEffect(() => {
    if (projects.length > 0 && selectedProjects.length > 0) {
      generateTasksFromProjects()
    } else {
      setTasks([])
      setSchedule([])
    }
  }, [selectedProjects, projects])


  // 保存排期到数据库
  async function saveSchedule() {
    if (schedule.length === 0) {
      showToastMessage("没有排期可保存")
      return
    }

    setSaving(true)
    try {
      // 删除旧排期
      if (selectedProjects.length > 0) {
        await supabase
          .from("smart_schedules")
          .delete()
          .in("project_id", selectedProjects)
      }

      // 保存新排期
      const schedulesToSave = schedule.map((s) => {
        const task = tasks.find(t => t.id === s.taskId)
        return {
          project_id: task?.projectId || "",
          task_id: s.taskId,
          task_type: task?.taskType || "",
          worker_id: s.workerId || null,
          worker_name: s.workerName || null,
          start_date: s.startDate.toISOString().split('T')[0],
          end_date: s.endDate.toISOString().split('T')[0],
          status: "scheduled",
          estimated_days: task?.estimatedDays || 0,
        }
      }).filter(s => s.project_id) // 过滤掉没有project_id的记录

      if (schedulesToSave.length > 0) {
        const { error } = await supabase
          .from("smart_schedules")
          .insert(schedulesToSave)

        if (error) throw error
        showToastMessage("排期已保存")
      }
    } catch (error: any) {
      console.error("保存排期失败:", error)
      showToastMessage(`保存排期失败: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  function showToastMessage(message: string) {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  async function loadData() {
    setLoading(true)
    try {
      // 加载项目
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      // 从数据库加载工人
      const { data: workersData, error: workersError } = await supabase
        .from("workers")
        .select("*")
        .order("created_at", { ascending: false })

      if (workersError) {
        console.error("加载工人失败:", workersError)
      }

      // 如果数据库中没有工人，创建默认工人
      if (!workersData || workersData.length === 0) {
        const defaultWorkers: Worker[] = [
          { id: "1", name: "张师傅", role: "水电工", skills: ["水电"], maxConcurrent: 2 },
          { id: "2", name: "李师傅", role: "木工", skills: ["木工"], maxConcurrent: 1 },
          { id: "3", name: "王师傅", role: "油漆工", skills: ["油漆"], maxConcurrent: 1 },
          { id: "4", name: "赵师傅", role: "全工种", skills: ["水电", "木工", "油漆"], maxConcurrent: 1 },
        ]
        
        // 将默认工人插入数据库
        for (const worker of defaultWorkers) {
          await supabase.from("workers").insert({
            name: worker.name,
            role: worker.role,
            skills: worker.skills,
            max_concurrent: worker.maxConcurrent,
          })
        }
        
        // 重新加载工人
        const { data: newWorkersData } = await supabase
          .from("workers")
          .select("*")
          .order("created_at", { ascending: false })
        
        setWorkers((newWorkersData || []).map(w => ({
          id: w.id,
          name: w.name,
          role: w.role,
          skills: w.skills || [],
          maxConcurrent: w.max_concurrent || 1,
        })))
      } else {
        // 转换数据库格式到组件格式
        setWorkers(workersData.map(w => ({
          id: w.id,
          name: w.name,
          role: w.role,
          skills: w.skills || [],
          maxConcurrent: w.max_concurrent || 1,
        })))
      }

      setProjects((projectsData || []) as ProjectRow[])
      // 默认选中所有项目
      if (selectedProjects.length === 0) {
        setSelectedProjects((projectsData || []).map(p => p.id))
      }
    } catch (error) {
      console.error("加载数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  function generateTasksFromProjects() {
    const generatedTasks: Task[] = []
    const projectsToProcess = projects.filter(p => selectedProjects.includes(p.id))
    
    projectsToProcess.forEach((project) => {
      // 为每个项目创建基础任务
      generatedTasks.push({
        id: `${project.id}-design`,
        projectId: project.id,
        projectTitle: project.title || "未命名项目",
        taskType: "设计",
        estimatedDays: 7,
        priority: 8,
        dependencies: [],
        requiredSkills: ["设计"],
        status: "pending",
      })
      generatedTasks.push({
        id: `${project.id}-water`,
        projectId: project.id,
        projectTitle: project.title || "未命名项目",
        taskType: "水电",
        estimatedDays: 5,
        priority: 7,
        dependencies: [`${project.id}-design`],
        requiredSkills: ["水电"],
        status: "pending",
      })
      generatedTasks.push({
        id: `${project.id}-wood`,
        projectId: project.id,
        projectTitle: project.title || "未命名项目",
        taskType: "木工",
        estimatedDays: 10,
        priority: 6,
        dependencies: [`${project.id}-water`],
        requiredSkills: ["木工"],
        status: "pending",
      })
      generatedTasks.push({
        id: `${project.id}-paint`,
        projectId: project.id,
        projectTitle: project.title || "未命名项目",
        taskType: "油漆",
        estimatedDays: 5,
        priority: 5,
        dependencies: [`${project.id}-wood`],
        requiredSkills: ["油漆"],
        status: "pending",
      })
    })

    setTasks(generatedTasks)
    
    // 任务生成后，加载已保存的排期
    if (generatedTasks.length > 0) {
      loadSavedScheduleForTasks(generatedTasks)
    }
  }

  // 加载已保存的排期
  async function loadSavedScheduleForTasks(taskList: Task[]) {
    if (selectedProjects.length === 0 || taskList.length === 0) return
    
    try {
      const taskIds = taskList.map(t => t.id)
      const { data, error } = await supabase
        .from("smart_schedules")
        .select("*")
        .in("project_id", selectedProjects)
        .in("task_id", taskIds)
        .order("start_date", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        // 转换数据库格式到组件格式
        const loadedSchedule: Schedule[] = data.map((s: any) => ({
          taskId: s.task_id,
          workerId: s.worker_id || "",
          workerName: s.worker_name || "",
          startDate: new Date(s.start_date),
          endDate: new Date(s.end_date),
        }))

        setSchedule(loadedSchedule)

        // 更新任务状态
        setTasks((prevTasks) =>
          prevTasks.map((task) => {
            const scheduled = loadedSchedule.find((s) => s.taskId === task.id)
            if (scheduled) {
              return {
                ...task,
                status: "scheduled",
                startDate: scheduled.startDate,
                endDate: scheduled.endDate,
                workerId: scheduled.workerId,
                workerName: scheduled.workerName,
              }
            }
            return task
          })
        )

        // 检测冲突
        const detectedConflicts = detectConflicts(loadedSchedule)
        setConflicts(detectedConflicts)
      }
    } catch (error) {
      console.error("加载排期失败:", error)
    }
  }

  function topologicalSort(tasks: Task[]): Task[] {
    const sorted: Task[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    function visit(task: Task) {
      if (visiting.has(task.id)) {
        console.warn("检测到循环依赖:", task.id)
        return
      }
      if (visited.has(task.id)) return

      visiting.add(task.id)

      task.dependencies.forEach((depId) => {
        const depTask = tasks.find((t) => t.id === depId)
        if (depTask) visit(depTask)
      })

      visiting.delete(task.id)
      visited.add(task.id)
      sorted.push(task)
    }

    tasks.forEach((task) => {
      if (!visited.has(task.id)) {
        visit(task)
      }
    })

    return sorted
  }

  function datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && start2 < end1
  }

  function findAvailableWorker(
    task: Task,
    workers: Worker[],
    schedule: Schedule[],
    proposedStartDate: Date
  ): Worker | null {
    return workers.find((worker) => {
      // 检查技能匹配
      const hasSkills = task.requiredSkills.every((skill) =>
        worker.skills.includes(skill)
      )
      if (!hasSkills) return false

      // 检查并发限制
      const currentTasks = schedule.filter(
        (s) =>
          s.workerId === worker.id &&
          datesOverlap(
            proposedStartDate,
            new Date(proposedStartDate.getTime() + task.estimatedDays * 24 * 60 * 60 * 1000),
            s.startDate,
            s.endDate
          )
      )
      if (currentTasks.length >= worker.maxConcurrent) return false

      return true
    }) || null
  }

  function calculateStartDate(task: Task, schedule: Schedule[]): Date {
    // 检查依赖任务
    if (task.dependencies.length > 0) {
      const depEndDates = task.dependencies
        .map((depId) => {
          const depSchedule = schedule.find((s) => s.taskId === depId)
          return depSchedule ? depSchedule.endDate : new Date()
        })
        .filter((date) => date > new Date())

      if (depEndDates.length > 0) {
        const latestDepDate = new Date(Math.max(...depEndDates.map((d) => d.getTime())))
        return new Date(latestDepDate.getTime() + 24 * 60 * 60 * 1000) // 依赖完成后第二天
      }
    }

    return new Date() // 默认从今天开始
  }

  function detectConflicts(schedules: Schedule[]): Conflict[] {
    const conflicts: Conflict[] = []
    const workerSchedules = new Map<string, Schedule[]>()

    schedules.forEach((s) => {
      if (!workerSchedules.has(s.workerId)) {
        workerSchedules.set(s.workerId, [])
      }
      workerSchedules.get(s.workerId)!.push(s)
    })

    workerSchedules.forEach((workerTasks, workerId) => {
      for (let i = 0; i < workerTasks.length; i++) {
        for (let j = i + 1; j < workerTasks.length; j++) {
          if (
            datesOverlap(
              workerTasks[i].startDate,
              workerTasks[i].endDate,
              workerTasks[j].startDate,
              workerTasks[j].endDate
            )
          ) {
            conflicts.push({
              type: "worker_conflict",
              task1Id: workerTasks[i].taskId,
              task2Id: workerTasks[j].taskId,
              workerId,
              message: `工人 ${workerTasks[i].workerName} 在同一时间段被分配了多个任务`,
            })
          }
        }
      }
    })

    return conflicts
  }

  function generateSchedule() {
    setScheduling(true)
    setConflicts([])

    try {
      // 按优先级和依赖关系排序
      const sortedTasks = topologicalSort([...tasks])

      const newSchedule: Schedule[] = []

      sortedTasks.forEach((task) => {
        const startDate = calculateStartDate(task, newSchedule)
        const availableWorker = findAvailableWorker(task, workers, newSchedule, startDate)

        if (availableWorker) {
          const endDate = new Date(
            startDate.getTime() + task.estimatedDays * 24 * 60 * 60 * 1000
          )
          newSchedule.push({
            taskId: task.id,
            workerId: availableWorker.id,
            workerName: availableWorker.name,
            startDate,
            endDate,
          })
        }
      })

      setSchedule(newSchedule)

      // 检测冲突
      const detectedConflicts = detectConflicts(newSchedule)
      setConflicts(detectedConflicts)

      // 更新任务状态
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          const scheduled = newSchedule.find((s) => s.taskId === task.id)
          if (scheduled) {
            return {
              ...task,
              status: detectedConflicts.some((c) => c.task1Id === task.id || c.task2Id === task.id)
                ? "conflict"
                : "scheduled",
              startDate: scheduled.startDate,
              endDate: scheduled.endDate,
              workerId: scheduled.workerId,
              workerName: scheduled.workerName,
            }
          }
          return { ...task, status: "pending" }
        })
      )
    } catch (error) {
      console.error("生成排期失败:", error)
    } finally {
      setScheduling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    )
  }

  async function addWorker() {
    if (!newWorker.name || !newWorker.role) {
      showToastMessage("请填写工人姓名和角色")
      return
    }
    
    try {
      // 保存到数据库
      const { data, error } = await supabase
        .from("workers")
        .insert({
          name: newWorker.name,
          role: newWorker.role,
          skills: newWorker.skills,
          max_concurrent: newWorker.maxConcurrent,
        })
        .select()
        .single()

      if (error) throw error

      // 添加到本地状态
      const worker: Worker = {
        id: data.id,
        name: data.name,
        role: data.role,
        skills: data.skills || [],
        maxConcurrent: data.max_concurrent || 1,
      }
      setWorkers([...workers, worker])
      setNewWorker({ name: "", role: "", skills: [], maxConcurrent: 1 })
      setShowWorkerModal(false)
      showToastMessage("工人已添加")
    } catch (error: any) {
      console.error("添加工人失败:", error)
      showToastMessage(`添加工人失败: ${error.message}`)
    }
  }

  function handleDeleteWorker(id: string) {
    setWorkerToDelete(id)
    setShowDeleteConfirm(true)
  }

  async function confirmDeleteWorker() {
    if (!workerToDelete) return
    
    try {
      // 从数据库删除
      const { error } = await supabase
        .from("workers")
        .delete()
        .eq("id", workerToDelete)

      if (error) throw error

      // 从本地状态移除
      setWorkers(workers.filter(w => w.id !== workerToDelete))
      showToastMessage("工人已删除")
    } catch (error: any) {
      console.error("删除工人失败:", error)
      showToastMessage(`删除工人失败: ${error.message}`)
    } finally {
      setShowDeleteConfirm(false)
      setWorkerToDelete(null)
    }
  }

  function toggleProjectSelection(projectId: string) {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter(id => id !== projectId))
    } else {
      setSelectedProjects([...selectedProjects, projectId])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能排期系统</h1>
          <p className="text-sm text-gray-600 mt-1">
            根据项目工期和工人资源自动优化施工排期
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowProjectModal(true)}
            variant="ghost"
            className="border border-gray-300"
          >
            选择项目
          </Button>
          <Button
            onClick={() => setShowWorkerModal(true)}
            variant="ghost"
            className="border border-gray-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加工人
          </Button>
          <Button
            onClick={generateSchedule}
            disabled={scheduling || tasks.length === 0}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            {scheduling ? "排期中..." : "生成排期"}
          </Button>
          {schedule.length > 0 && (
            <Button
              onClick={saveSchedule}
              disabled={saving || schedule.length === 0}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {saving ? "保存中..." : "保存排期"}
            </Button>
          )}
        </div>
      </div>

      {/* 冲突提示 */}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 shadow-sm">
          <div className="flex items-start gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">
                检测到 {conflicts.length} 个冲突
              </h3>
              <div className="space-y-1">
                {conflicts.map((conflict, index) => (
                  <p key={index} className="text-sm text-orange-700">
                    {conflict.message}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 排期结果 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 任务列表 */}
        <Card title={`任务列表 (${tasks.length})`}>
          <div className="p-6">
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {tasks.map((task) => {
                const scheduled = schedule.find((s) => s.taskId === task.id)
                const taskIndex = tasks.findIndex(t => t.id === task.id)
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border ${
                      task.status === "conflict"
                        ? "border-orange-300 bg-orange-50"
                        : task.status === "scheduled"
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {task.projectTitle} - {task.taskType}
                          </span>
                          {task.status === "scheduled" && (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                          {task.status === "conflict" && (
                            <XCircle className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                        {scheduled ? (
                          <div className="text-sm text-gray-600 space-y-2 mt-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3" />
                              <select
                                value={scheduled.workerId}
                                onChange={(e) => {
                                  const newWorkerId = e.target.value
                                  const newWorker = workers.find(w => w.id === newWorkerId)
                                  if (newWorker) {
                                    setSchedule(prev => prev.map(s => 
                                      s.taskId === task.id 
                                        ? { ...s, workerId: newWorker.id, workerName: newWorker.name }
                                        : s
                                    ))
                                    setTasks(prev => prev.map(t =>
                                      t.id === task.id
                                        ? { ...t, workerId: newWorker.id, workerName: newWorker.name }
                                        : t
                                    ))
                                  }
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
                              >
                                {workers.map(w => (
                                  <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Calendar className="w-3 h-3" />
                              <input
                                type="date"
                                value={scheduled.startDate.toISOString().split('T')[0]}
                                onChange={(e) => {
                                  const newStartDate = new Date(e.target.value)
                                  const daysDiff = Math.ceil((scheduled.endDate.getTime() - scheduled.startDate.getTime()) / (1000 * 60 * 60 * 24))
                                  const newEndDate = new Date(newStartDate.getTime() + daysDiff * 24 * 60 * 60 * 1000)
                                  setSchedule(prev => prev.map(s =>
                                    s.taskId === task.id
                                      ? { ...s, startDate: newStartDate, endDate: newEndDate }
                                      : s
                                  ))
                                  setTasks(prev => prev.map(t =>
                                    t.id === task.id
                                      ? { ...t, startDate: newStartDate, endDate: newEndDate }
                                      : t
                                  ))
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
                              />
                              <span> - </span>
                              <input
                                type="date"
                                value={scheduled.endDate.toISOString().split('T')[0]}
                                onChange={(e) => {
                                  const newEndDate = new Date(e.target.value)
                                  setSchedule(prev => prev.map(s =>
                                    s.taskId === task.id
                                      ? { ...s, endDate: newEndDate }
                                      : s
                                  ))
                                  setTasks(prev => prev.map(t =>
                                    t.id === task.id
                                      ? { ...t, endDate: newEndDate }
                                      : t
                                  ))
                                  // 更新工期天数
                                  const newDays = Math.ceil((newEndDate.getTime() - scheduled.startDate.getTime()) / (1000 * 60 * 60 * 24))
                                  setTasks(prev => prev.map(t =>
                                    t.id === task.id
                                      ? { ...t, estimatedDays: newDays }
                                      : t
                                  ))
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              <span>工期: </span>
                              <input
                                type="number"
                                min="1"
                                value={task.estimatedDays}
                                onChange={(e) => {
                                  const newDays = parseInt(e.target.value) || 1
                                  setTasks(prev => prev.map(t =>
                                    t.id === task.id
                                      ? { ...t, estimatedDays: newDays }
                                      : t
                                  ))
                                  // 更新排期中的结束日期
                                  if (scheduled) {
                                    const newEndDate = new Date(
                                      scheduled.startDate.getTime() + newDays * 24 * 60 * 60 * 1000
                                    )
                                    setSchedule(prev => prev.map(s =>
                                      s.taskId === task.id
                                        ? { ...s, endDate: newEndDate }
                                        : s
                                    ))
                                  }
                                }}
                                className="w-16 text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
                              />
                              <span> 天</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 mt-2">
                            未分配
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* 工人工作负荷 */}
        <Card title={`工人列表 (${workers.length})`}>
          <div className="p-6">
            <div className="space-y-4">
              {workers.map((worker) => {
                const workerTasks = schedule.filter((s) => s.workerId === worker.id)
                const utilization = (workerTasks.length / worker.maxConcurrent) * 100

                return (
                  <div
                    key={worker.id}
                    className="p-4 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {worker.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({worker.role})
                          </span>
                          <span className="text-xs text-gray-400">
                            {worker.skills.join(", ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {workerTasks.length}/{worker.maxConcurrent} 任务
                        </span>
                        <button
                          onClick={() => handleDeleteWorker(worker.id)}
                          className="p-1 hover:bg-red-50 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          utilization >= 100
                            ? "bg-red-500"
                            : utilization >= 80
                            ? "bg-orange-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      利用率: {utilization.toFixed(0)}%
                    </div>
                  </div>
                )
              })}
              {workers.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-8">
                  暂无工人，点击"添加工人"添加
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 项目选择模态框 */}
      {showProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowProjectModal(false)} />
          <div className="relative z-[101] w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">选择项目</h3>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {projects.map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => toggleProjectSelection(project.id)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{project.title}</div>
                      <div className="text-sm text-gray-500">
                        {project.category} · {project.location}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowProjectModal(false)}>
                  取消
                </Button>
                <Button
                  onClick={() => {
                    setShowProjectModal(false)
                    // 任务会在 useEffect 中自动重新生成
                  }}
                >
                  确认
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加工人模态框 */}
      {showWorkerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowWorkerModal(false)} />
          <div className="relative z-[101] w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">添加工人</h3>
                <button
                  onClick={() => setShowWorkerModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 *
                  </label>
                  <Input
                    value={newWorker.name}
                    onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                    placeholder="例如：张师傅"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色 *
                  </label>
                  <Input
                    value={newWorker.role}
                    onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value })}
                    placeholder="例如：水电工"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    技能（用逗号分隔）
                  </label>
                  <Input
                    value={newWorker.skills.join(", ")}
                    onChange={(e) => setNewWorker({ ...newWorker, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    placeholder="例如：水电, 木工"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大并发任务数
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={newWorker.maxConcurrent}
                    onChange={(e) => setNewWorker({ ...newWorker, maxConcurrent: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowWorkerModal(false)}>
                  取消
                </Button>
                <Button onClick={addWorker}>
                  添加
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 气泡提示 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-top-5">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => {
            setShowDeleteConfirm(false)
            setWorkerToDelete(null)
          }} />
          <div className="relative z-[201] w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-sm text-gray-600 mb-6">
                您确定要删除该工人吗？此操作无法撤销。
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setWorkerToDelete(null)
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={confirmDeleteWorker}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  确认删除
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


