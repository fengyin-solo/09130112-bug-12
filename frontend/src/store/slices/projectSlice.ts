import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { projectsAPI } from '../../services/api';
import { Project, ProjectMember } from '../../types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  members: ProjectMember[];
  loading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  members: [],
  loading: false,
  error: null,
};

export const fetchProjects = createAsyncThunk('projects/fetchProjects', async (_, { rejectWithValue }) => {
  try {
    const response = await projectsAPI.list();
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || '获取项目列表失败');
  }
});

export const createProject = createAsyncThunk('projects/createProject', async (data: any, { rejectWithValue }) => {
  try {
    const response = await projectsAPI.create(data);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || '创建项目失败');
  }
});

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.update(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '更新项目失败');
    }
  }
);

export const deleteProject = createAsyncThunk('projects/deleteProject', async (id: number, { rejectWithValue }) => {
  try {
    await projectsAPI.delete(id);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || '删除项目失败');
  }
});

export const fetchProjectMembers = createAsyncThunk(
  'projects/fetchProjectMembers',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.listMembers(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '获取项目成员失败');
    }
  }
);

export const addProjectMember = createAsyncThunk(
  'projects/addProjectMember',
  async ({ projectId, data }: { projectId: number; data: any }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.addMember(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '添加成员失败');
    }
  }
);

export const updateProjectMember = createAsyncThunk(
  'projects/updateProjectMember',
  async ({ projectId, memberId, data }: { projectId: number; memberId: number; data: any }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.updateMember(projectId, memberId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '更新成员失败');
    }
  }
);

export const removeProjectMember = createAsyncThunk(
  'projects/removeProjectMember',
  async ({ projectId, memberId }: { projectId: number; memberId: number }, { rejectWithValue }) => {
    try {
      await projectsAPI.removeMember(projectId, memberId);
      return memberId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '移除成员失败');
    }
  }
);

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
    clearProjectError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action: PayloadAction<Project[]>) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createProject.fulfilled, (state, action: PayloadAction<Project>) => {
        state.projects.push(action.payload);
      })
      .addCase(updateProject.fulfilled, (state, action: PayloadAction<Project>) => {
        const index = state.projects.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
      })
      .addCase(deleteProject.fulfilled, (state, action: PayloadAction<number>) => {
        state.projects = state.projects.filter((p) => p.id !== action.payload);
        if (state.currentProject?.id === action.payload) {
          state.currentProject = null;
        }
      })
      .addCase(fetchProjectMembers.fulfilled, (state, action: PayloadAction<ProjectMember[]>) => {
        state.members = action.payload;
      })
      .addCase(addProjectMember.fulfilled, (state, action: PayloadAction<ProjectMember>) => {
        state.members.push(action.payload);
      })
      .addCase(updateProjectMember.fulfilled, (state, action: PayloadAction<ProjectMember>) => {
        const index = state.members.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) {
          state.members[index] = action.payload;
        }
      })
      .addCase(removeProjectMember.fulfilled, (state, action: PayloadAction<number>) => {
        state.members = state.members.filter((m) => m.id !== action.payload);
      });
  },
});

export const { setCurrentProject, clearProjectError } = projectSlice.actions;
export default projectSlice.reducer;
