// components/login/interfaces.ts

export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
  user?: User;
}

export interface ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status?: number; 
}

export interface LoginPageProps {
  onLogin: (success: boolean, token?: string) => void;
}

export type ServerStatus = 'checking' | 'connected' | 'disconnected';

// *** INTERFACES PARA PROYECTOS - ACTUALIZADAS ***

export interface ProyectoBase {
  nombre: string;
  descripcion: string;
  responsable?: string;
  presupuesto?: number;
  categoria?: string;
  email?: string;
  cedula?: string;
  telefono?: string;
  phone?: string; // Campo alternativo
  address?: string;
  direccion?: string; // Campo alternativo
}

export interface ProyectoAPI extends ProyectoBase {
  id: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'en-progreso' | 'completado';
  fechaEnvio?: string;
  fechaInicio?: string;
  fechaFin?: string;
  // Campos adicionales que pueden venir de la API
  name?: string; // Campo alternativo para nombre
  title?: string; // Campo alternativo para nombre
  description?: string; // Campo alternativo para descripcion
  desc?: string; // Campo alternativo para descripcion
  status?: string; // Campo alternativo para estado
  fecha_envio?: string; // Campo alternativo para fechaEnvio
  fecha_inicio?: string; // Campo alternativo para fechaInicio
  fecha_fin?: string; // Campo alternativo para fechaFin
  startDate?: string; // Campo alternativo para fechaInicio
  endDate?: string; // Campo alternativo para fechaFin
  responsible?: string; // Campo alternativo para responsable
  autor?: string; // Campo alternativo para responsable
  budget?: number; // Campo alternativo para presupuesto
  category?: string; // Campo alternativo para categoria
  cat?: string; // Campo alternativo para categoria
  correo?: string; // Campo alternativo para email
  mail?: string; // Campo alternativo para email
  identification?: string; // Campo alternativo para cedula
  identificacion?: string; // Campo alternativo para cedula
  tel?: string; // Campo alternativo para telefono
  celular?: string; // Campo alternativo para telefono
  location?: string; // Campo alternativo para address
}

export interface ProyectoStats {
  totalProyectos: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  empty: boolean;
  sort: {
    sorted: boolean;
    empty: boolean;
    unsorted: boolean;
  };
}

// *** INTERFACES PARA NEGOCIOS - NUEVAS ***

export interface BusinessCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface BusinessUser {
  id: number;
  name: string;
  email: string;
  identification: string;
}

// Enums para business
export type DeliveryService = 'SI' | 'NO';
export type SalePlace = 'LOCAL_FIJO' | 'AMBULANTE' | 'OTRO';
export type ValidationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// DTO para crear nuevo negocio (campos obligatorios)
export interface CreateNewBusinessDTO {
  categoryId: number; // NOT NULL
  commercialName: string; // NOT NULL
  representativeName: string; // NOT NULL
  phone: string; // NOT NULL
  email: string; // NOT NULL
  parishCommunitySector: string; // NOT NULL
  description: string; // NOT NULL
  productsServices: string[]; // puede ser vacío pero no nulo
  acceptsWhatsappOrders: boolean; // NOT NULL
  deliveryService: DeliveryService; // NOT NULL
  salePlace: SalePlace; // NOT NULL
  registrationDate: string; // LocalDate NOT NULL (formato ISO string)
  address: string; // NOT NULL
  googleMapsCoordinates: string; // NOT NULL
  schedules: string[]; // puede ser vacío pero no nulo
  
  // Campos opcionales
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
  udelSupportDetails?: string;
  signatureUrl?: string;
  cedulaFileUrl?: string;
  logoUrl?: string;
  validationStatus?: ValidationStatus;
}

// Interface para archivos de negocio en multipart
export interface BusinessFiles {
  logoFile?: File; // Imagen opcional del logo
  signatureFile?: File; // Imagen opcional de la firma
  cedulaFile: File; // Imagen obligatoria de la cédula/RUC
  carrouselPhotos?: File[]; // Imágenes opcionales para el carrusel (múltiples archivos)
}

// Interface completa para crear negocio con multipart
export interface CreateBusinessRequest {
  business: CreateNewBusinessDTO;
  files: BusinessFiles;
}

// Interface para negocio completo (respuesta de API)
export interface BusinessAPI {
  id: number;
  commercialName: string;
  representativeName: string;
  cedulaOrRuc: string;
  phone: string;
  email: string;
  parishCommunitySector: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  website: string;
  description: string;
  productsServices: string | null;
  acceptsWhatsappOrders: boolean;
  deliveryService: DeliveryService;
  salePlace: SalePlace;
  receivedUdelSupport: boolean | null;
  udelSupportDetails: string | null;
  signatureUrl: string | null;
  registrationDate: string | null;
  cedulaFileUrl: string | null;
  logoUrl: string | null;
  validationStatus: ValidationStatus;
  user: BusinessUser;
  category: BusinessCategory;
  whatsappNumber?: string;
  address?: string;
  googleMapsCoordinates?: string;
  logoUrl?: string;
  photos?: string[];
  schedules?: string[];
}

// Interface para respuesta paginada de negocios
export interface PaginatedBusinessResponse {
  page: number;
  content: BusinessAPI[];
  size: number;
  totalElements: number;
  totalPages: number;
}

// Interface para estadísticas de negocios
export interface BusinessStats {
  totalNegocios: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
}

// Interface para negocio público aprobado (endpoint /business/public/approved)
export interface ApprovedBusinessResponse {
  success: boolean;
  message: string;
  data: PaginatedBusinessResponse;
}