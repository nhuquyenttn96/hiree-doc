import { db } from "../firebase";
import { ref, get, push, set, update, remove } from "firebase/database";

const useFirebase = true; // Hardcoded to true now

// --- LOCAL STORAGE FALLBACK ---
const getLocalData = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setLocalData = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- PROJECTS (Master Data) ---
export const getProjects = async () => {
  if (useFirebase) {
    const projectsRef = ref(db, 'hiree_projects');
    const snapshot = await get(projectsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
  } else {
    return getLocalData("projects");
  }
};

export const addProject = async (projectData) => {
  if (useFirebase) {
    const projectsRef = ref(db, 'hiree_projects');
    const newRef = push(projectsRef);
    await set(newRef, projectData);
    return { id: newRef.key, ...projectData };
  } else {
    const projects = getLocalData("projects");
    const newProject = { id: generateId(), ...projectData };
    projects.push(newProject);
    setLocalData("projects", projects);
    return newProject;
  }
};

export const updateProject = async (id, projectData) => {
  if (useFirebase) {
    const projectRef = ref(db, `hiree_projects/${id}`);
    await update(projectRef, projectData);
    return { id, ...projectData };
  } else {
    const projects = getLocalData("projects");
    const index = projects.findIndex(p => p.id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...projectData };
      setLocalData("projects", projects);
      return projects[index];
    }
  }
};

export const deleteProject = async (id) => {
  if (useFirebase) {
    const projectRef = ref(db, `hiree_projects/${id}`);
    await remove(projectRef);
  } else {
    const projects = getLocalData("projects");
    setLocalData("projects", projects.filter(p => p.id !== id));
  }
};

export const deleteProjectsBatch = async (ids) => {
  if (useFirebase) {
    const updates = {};
    ids.forEach(id => {
      updates[`hiree_projects/${id}`] = null;
    });
    await update(ref(db), updates);
  } else {
    const projects = getLocalData("projects");
    setLocalData("projects", projects.filter(p => !ids.includes(p.id)));
  }
};

// Batch add projects (from Excel)
export const addProjectsBatch = async (projectsArray) => {
  if (useFirebase) {
    const updates = {};
    const projectsRef = ref(db, 'hiree_projects');
    projectsArray.forEach(p => {
      const newKey = push(projectsRef).key;
      updates[`hiree_projects/${newKey}`] = p;
    });
    await update(ref(db), updates);
  } else {
    const projects = getLocalData("projects");
    const newProjects = projectsArray.map(p => ({ id: generateId(), ...p }));
    setLocalData("projects", [...projects, ...newProjects]);
  }
};


// --- DOCUMENTS (Transactions) ---
export const getDocuments = async () => {
  if (useFirebase) {
    const docsRef = ref(db, 'hiree_documents');
    const snapshot = await get(docsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
  } else {
    return getLocalData("documents");
  }
};

export const addDocument = async (docData) => {
  if (useFirebase) {
    const docsRef = ref(db, 'hiree_documents');
    const newRef = push(docsRef);
    const finalData = { ...docData, createdAt: new Date().toISOString() };
    await set(newRef, finalData);
    return { id: newRef.key, ...finalData };
  } else {
    const documents = getLocalData("documents");
    const newDoc = { id: generateId(), ...docData, createdAt: new Date().toISOString() };
    documents.push(newDoc);
    setLocalData("documents", documents);
    return newDoc;
  }
};

export const updateDocument = async (id, docData) => {
  if (useFirebase) {
    const docRef = ref(db, `hiree_documents/${id}`);
    const finalData = { ...docData, updatedAt: new Date().toISOString() };
    await update(docRef, finalData);
    return { id, ...finalData };
  } else {
    const documents = getLocalData("documents");
    const index = documents.findIndex(d => d.id === id);
    if (index !== -1) {
      documents[index] = { ...documents[index], ...docData, updatedAt: new Date().toISOString() };
      setLocalData("documents", documents);
      return documents[index];
    }
  }
};

export const deleteDocument = async (id) => {
  if (useFirebase) {
    const docRef = ref(db, `hiree_documents/${id}`);
    await remove(docRef);
  } else {
    const documents = getLocalData("documents");
    setLocalData("documents", documents.filter(d => d.id !== id));
  }
};
