// components/login/ApiService.ts
import { 
  LoginRequest, 
  LoginResponse, 
  ApiResponse, 
  User, 
  ProyectoBase, 
  ProyectoAPI, 
  PaginatedResponse 
} from './interfaces';

export class ApiService {
  private readonly API_BASE_URL = 'http://34.10.172.54:8080';
  private authToken: string | null = null;

  // *** MÉTODOS DE GESTIÓN DE TOKEN MEJORADOS ***
  
  private getAuthToken(): string | null {
    // Prioridad: memoria > sessionStorage > localStorage (múltiples claves de compatibilidad)
    if (this.authToken) {
      return this.authToken;
    }

    const STORAGE_KEYS = ['auth_token', 'authToken', 'token'];

    // Intentar recuperar de sessionStorage
    try {
      for (const key of STORAGE_KEYS) {
        const sessionToken = sessionStorage.getItem(key);
        if (sessionToken) {
          this.authToken = sessionToken;
          console.log(`🔄 Token recuperado desde sessionStorage (${key})`);
          return sessionToken;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error accediendo sessionStorage:', error);
    }

    // Intentar recuperar de localStorage como respaldo
    try {
      for (const key of STORAGE_KEYS) {
        const localToken = localStorage.getItem(key);
        if (localToken) {
          this.authToken = localToken;
          console.log(`🔄 Token recuperado desde localStorage (${key})`);
          return localToken;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error accediendo localStorage:', error);
    }

    return null;
  }

  private setAuthToken(token: string): void {
    this.authToken = token;
    console.log('🔐 Token guardado exitosamente en memoria');
    console.log('🔑 Token preview:', token.substring(0, 50) + '...');
    
    // Guardar en sessionStorage (prioridad alta) usando varias claves por compatibilidad
    try {
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('authToken', token);
      sessionStorage.setItem('token', token);
      console.log('💾 Token guardado en sessionStorage (auth_token/authToken/token)');
    } catch (error) {
      console.warn('⚠️ Error guardando en sessionStorage:', error);
    }
    
    // Guardar en localStorage como respaldo
    try {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('authToken', token);
      localStorage.setItem('token', token);
      localStorage.setItem('isAuthenticated', 'true');
      console.log('💾 Token guardado en localStorage (auth_token/authToken/token)');
    } catch (error) {
      console.warn('⚠️ Error guardando en localStorage:', error);
    }
  }

  private clearAuthToken(): void {
    this.authToken = null;
    console.log('🗑️ Token eliminado de memoria');
    
    // Limpiar de sessionStorage
    try {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('token');
      console.log('🗑️ Token eliminado de sessionStorage');
    } catch (error) {
      console.warn('⚠️ Error limpiando sessionStorage:', error);
    }
    
    // Limpiar de localStorage
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      console.log('🗑️ Token eliminado de localStorage');
    } catch (error) {
      console.warn('⚠️ Error limpiando localStorage:', error);
    }
  }

  // *** MÉTODOS PÚBLICOS PARA GESTIÓN DE TOKEN ***
  
  public isAuthenticated(): boolean {
    const token = this.getAuthToken();
    if (!token) {
      console.log('🔍 No hay token disponible');
      return false;
    }
    
    if (this.isTokenExpired()) {
      console.log('🔍 Token expirado');
      this.clearAuthToken();
      return false;
    }
    
    console.log('🔍 Token válido y no expirado');
    return true;
  }

  public hasValidToken(): boolean {
    return this.isAuthenticated();
  }

  public getCurrentToken(): string | null {
    return this.getAuthToken();
  }

  public setToken(token: string): void {
    this.setAuthToken(token);
  }

  public clearToken(): void {
    this.clearAuthToken();
  }

  // *** VERIFICACIÓN DE EXPIRACIÓN DE TOKEN ***
  public isTokenExpired(): boolean {
    const token = this.getAuthToken();
    if (!token) return true;
    
    try {
      // Decodificar el payload del JWT (sin validar la firma)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < currentTime;
      
      if (isExpired) {
        console.log('⚠️ Token expirado');
      }
      
      return isExpired;
    } catch (error) {
      console.error('Error al verificar expiración del token:', error);
      return true;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Header Authorization agregado con token');
    } else {
      console.warn('⚠️ No hay token disponible para agregar a headers');
    }

    return headers;
  }

  public async healthCheck(): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      console.log('🏥 Verificando salud del servidor...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(this.API_BASE_URL, {
          method: 'HEAD', 
          signal: controller.signal,
          headers: { 
            'Accept': '*/*',
            'Cache-Control': 'no-cache'
          },
        });
        
        clearTimeout(timeoutId);
        console.log(`✅ Servidor respondió con status: ${response.status}`);
        
        return {
          success: true,
          message: 'Servidor disponible',
          data: { status: 'ok', timestamp: new Date().toISOString() }
        };
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {
      console.error('❌ Error en health check:', error);
      
      let errorMessage = 'No se pudo conectar con el servidor';
      if (error instanceof DOMException && error.name === 'AbortError') {
        errorMessage = 'Timeout de conexión';
      } else if (error instanceof TypeError) {
        errorMessage = 'Error de red o CORS';
      }
      
      return {
        success: false,
        error: errorMessage,
        message: 'Servidor no disponible'
      };
    }
  }

  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('🔐 Intentando login con:', credentials.username);
      
      // Validaciones básicas
      if (!credentials.username?.trim() || !credentials.password?.trim()) {
        return {
          success: false,
          message: 'Usuario y contraseña son requeridos'
        };
      }

      // *** ENDPOINT ESPECÍFICO BASADO EN LA DOCUMENTACIÓN SWAGGER ***
      const endpoint = '/auth/login';
      
      try {
        console.log(`🎯 Usando endpoint: ${this.API_BASE_URL}${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const requestBody = JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password.trim()
        });
        
        console.log('📦 Request body:', requestBody);
        
        const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: requestBody,
          signal: controller.signal,
          mode: 'cors', 
        });

        clearTimeout(timeoutId);
        console.log(`📡 ${endpoint} respondió con status: ${response.status}`);
        console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

        let data: Record<string, unknown> = {};
        const contentType = response.headers.get('content-type') || '';
        
        try {
          const responseText = await response.text();
          console.log(`📄 Response text (${responseText.length} chars):`, responseText.substring(0, 500));
          
          if (responseText.trim()) {
            if (contentType.includes('application/json') || 
                responseText.trim().startsWith('{') || 
                responseText.trim().startsWith('[')) {
              data = JSON.parse(responseText);
            } else {
              data = { message: responseText };
            }
          } else {
            data = { message: 'Respuesta vacía del servidor' };
          }
        } catch (parseError) {
          console.error('❌ Error parseando respuesta:', parseError);
          data = { message: 'Error al procesar respuesta del servidor' };
        }

        console.log('📊 Datos procesados:', data);
        
        if (response.ok && (response.status >= 200 && response.status < 300)) {
          console.log('✅ Login exitoso!');
          
          // *** BÚSQUEDA MEJORADA Y ESPECÍFICA DEL TOKEN JWT ***
          let token: string | undefined;
          
          // 🎯 PRIORIDAD 1: Buscar específicamente 'jwt' (según swagger)
          if (data.jwt && typeof data.jwt === 'string') {
            token = data.jwt as string;
            console.log('🔍 ¡TOKEN JWT ENCONTRADO en campo "jwt"!');
          }
          
          // 🎯 PRIORIDAD 2: Buscar en campos comunes de respuesta
          if (!token) {
            const tokenFields = [
              'token', 'accessToken', 'access_token', 'authToken', 
              'bearerToken', 'sessionToken', 'apiToken', 'authenticationToken'
            ];
            
            for (const field of tokenFields) {
              if (data[field] && typeof data[field] === 'string') {
                token = data[field] as string;
                console.log(`🔍 Token encontrado en campo '${field}'`);
                break;
              }
            }
          }
          
          // 🎯 PRIORIDAD 3: Buscar en headers
          if (!token) {
            const headerFields = [
              'Authorization', 'X-Auth-Token', 'Access-Token', 
              'X-Access-Token', 'Bearer', 'X-JWT-Token'
            ];
            
            for (const headerField of headerFields) {
              const headerValue = response.headers.get(headerField);
              if (headerValue) {
                token = headerValue.replace(/^Bearer\s+/i, '');
                console.log(`🔍 Token encontrado en header '${headerField}'`);
                break;
              }
            }
          }
          
          // 🎯 PRIORIDAD 4: Búsqueda recursiva en objetos anidados
          if (!token && typeof data === 'object') {
            const findTokenRecursive = (obj: Record<string, unknown>, depth = 0): string | undefined => {
              if (depth > 3) return undefined; // Limitar profundidad
              
              for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string' && (
                  key.toLowerCase().includes('token') || 
                  key.toLowerCase().includes('jwt') ||
                  key.toLowerCase() === 'jwt'
                )) {
                  return value;
                }
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  const nestedToken = findTokenRecursive(value as Record<string, unknown>, depth + 1);
                  if (nestedToken) return nestedToken;
                }
              }
              return undefined;
            };
            
            token = findTokenRecursive(data);
            if (token) {
              console.log('🔍 Token encontrado en búsqueda recursiva');
            }
          }
          
          // *** GUARDAR EL TOKEN AUTOMÁTICAMENTE SI SE ENCUENTRA ***
          if (token && token.length > 10) { // Validación básica de longitud
            this.setAuthToken(token);
            console.log('🎉 ¡TOKEN CAPTURADO Y GUARDADO AUTOMÁTICAMENTE!');
            console.log('🔑 Token completo:', token);
            
            // *** VALIDACIÓN ADICIONAL: Verificar que es un JWT válido ***
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log('✅ Token JWT válido detectado');
                console.log('📋 Payload del token:', payload);
              } else {
                console.warn('⚠️ Token no parece ser un JWT válido (no tiene 3 partes)');
              }
            } catch (jwtError) {
              console.warn('⚠️ Error validando estructura JWT:', jwtError);
              // Aún así mantener el token por si es válido en el servidor
            }
            
          } else {
            console.warn('⚠️ NO SE ENCONTRÓ TOKEN VÁLIDO EN LA RESPUESTA');
            console.log('🔍 Respuesta completa para debug:', data);
            console.log('🔍 Headers completos:', Object.fromEntries(response.headers.entries()));
            
            // *** RESPUESTA EXITOSA PERO SIN TOKEN - CONTINUAR ***
            console.log('⚠️ Login exitoso pero sin token, continuando...');
          }
          
          // Extraer información del usuario
          const userData = (data.user || data.userData || data) as Record<string, unknown>;
          const user: User = {
            id: (userData.id || userData.userId || Date.now().toString()) as string,
            username: (userData.username as string) || credentials.username,
            email: (userData.email as string) || `${credentials.username}@ibarra.gob.ec`,
            role: (userData.role as string) || 'user'
          };
          
          return {
            success: true,
            token: this.getAuthToken() || undefined,
            user: user,
            message: (data.message as string) || 'Autenticación exitosa',
          };
        } else {
          const errorMessage = (data.message || data.error || `Error HTTP ${response.status}`) as string;
          console.log(`❌ Login falló: ${errorMessage}`);
          
          // Si es error de credenciales, devolver error específico
          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              message: 'Credenciales incorrectas. Verifique su usuario y contraseña.',
            };
          }
          
          return {
            success: false,
            message: errorMessage,
          };
        }
        
      } catch (endpointError) {
        console.error(`💥 Error con endpoint ${endpoint}:`, endpointError);
        
        if (endpointError instanceof DOMException && endpointError.name === 'AbortError') {
          return {
            success: false,
            message: 'Timeout de conexión. Intente nuevamente.',
          };
        } else if (endpointError instanceof TypeError) {
          return {
            success: false,
            message: 'Error de red o CORS. Verifique la conexión.',
          };
        } else {
          return {
            success: false,
            message: endpointError instanceof Error ? endpointError.message : 'Error desconocido',
          };
        }
      }
      
    } catch (loginError) {
      console.error('💥 Error general de login:', loginError);
      return {
        success: false,
        message: loginError instanceof Error ? loginError.message : 'Error de conexión con el servidor',
      };
    }
  }

  // *** MÉTODO GENÉRICO PARA PETICIONES CON TOKEN ***
  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.API_BASE_URL}${endpoint}`;
      
      console.log(`🌐 Petición a: ${url}`);
      console.log(`⚙️ Método: ${options.method || 'GET'}`);
      console.log(`🔑 Token presente: ${this.isAuthenticated()}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const config: RequestInit = {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      };

      let response: Response;
      
      try {
        response = await fetch(url, config);
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type') || '';
      let data: Record<string, unknown> | null = null;
      
      try {
        const responseText = await response.text();
        
        if (responseText.trim()) {
          if (contentType.includes('application/json') || 
              responseText.trim().startsWith('{') || 
              responseText.trim().startsWith('[')) {
            try {
              data = JSON.parse(responseText);
              console.log('📊 JSON parseado exitosamente');
            } catch (parseError) {
              console.error('❌ Error parseando JSON:', parseError);
              data = { 
                message: 'Error al parsear respuesta JSON',
                rawResponse: responseText.substring(0, 200)
              };
            }
          } else {
            console.log('📝 Respuesta no es JSON');
            data = { 
              message: responseText,
              type: 'text'
            };
          }
        } else {
          console.log('📭 Respuesta vacía');
          data = { message: 'Respuesta vacía del servidor' };
        }
      } catch (readError) {
        console.error('❌ Error leyendo respuesta:', readError);
        data = { message: 'Error al leer la respuesta del servidor' };
      }

      // Manejo de respuestas exitosas
      if (response.ok) {
        console.log('✅ Petición exitosa');
        return {
          success: true,
          data: data as T,
          message: data?.message as string || 'Operación exitosa',
          status: response.status,
        };
      }

      // Manejo de errores HTTP
      const errorMessage = (data?.message || 
                          data?.error || 
                          data?.detail ||
                          `HTTP ${response.status}: ${response.statusText}`) as string;
      
      console.error(`❌ Error HTTP: ${errorMessage}`);
      
      // Manejo específico de códigos de error
      if (response.status === 401) {
        console.warn('🚫 Token expirado o inválido, limpiando...');
        this.clearAuthToken();
        return {
          success: false,
          error: 'Sesión expirada. Inicie sesión nuevamente.',
          message: 'No autorizado',
          status: response.status,
        };
      }
      
      if (response.status === 403) {
        return {
          success: false,
          error: 'No tiene permisos para realizar esta operación.',
          message: 'Acceso denegado',
          status: response.status,
        };
      }
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
        status: response.status,
      };
      
    } catch (error) {
      console.error('💥 Error en petición:', error);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'La petición tardó demasiado tiempo. Verifique su conexión.',
          message: 'Timeout de conexión',
        };
      }
      
      if (error instanceof TypeError) {
        return {
          success: false,
          error: 'Error de red. Verifique su conexión a internet.',
          message: 'Error de conexión',
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        message: 'Error en la operación',
      };
    }
  }

  // *** MÉTODOS ESPECÍFICOS PARA PROYECTOS ***
  public async getProyectos(page: number = 0, size: number = 10, status?: string, search?: string): Promise<ApiResponse<PaginatedResponse<ProyectoAPI>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      ...(status && status !== 'all' && { estado: status }),
      ...(search && { search })
    });

    return this.request<PaginatedResponse<ProyectoAPI>>(`/api/proyectos?${params}`, {
      method: 'GET'
    });
  }

  public async getProyectosPendientes(page: number = 0, size: number = 10): Promise<ApiResponse<PaginatedResponse<ProyectoAPI>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    return this.request<PaginatedResponse<ProyectoAPI>>(`/admin/pending?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Obtiene las estadísticas del dashboard del administrador
   * Endpoint documentado en swagger: GET /admin/get-dashboard-stats
   */
  public async getAdminDashboardStats(): Promise<ApiResponse<{
    totalUsers: number;
    pendingUsers: number;
    approvedUsers: number;
    rejectedUsers?: number;
  }>> {
    return this.request<{
      totalUsers: number;
      pendingUsers: number;
      approvedUsers: number;
      rejectedUsers?: number;
    }>(`/admin/get-dashboard-stats`, {
      method: 'GET'
    });
  }

  public async aprobarProyecto(projectId: string): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>(`/admin/approve/${projectId}`, {
      method: 'POST'
    });
  }

  public async rechazarProyecto(projectId: string): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>(`/admin/reject/${projectId}`, {
      method: 'POST'
    });
  }

  public async createProyecto(projectData: ProyectoBase): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>('/api/proyectos', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }

  public async getProyecto(projectId: string): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>(`/api/proyectos/${projectId}`, {
      method: 'GET'
    });
  }

  public async updateProyecto(projectId: string, projectData: Partial<ProyectoBase>): Promise<ApiResponse<ProyectoAPI>> {
    return this.request<ProyectoAPI>(`/api/proyectos/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  }

  public async deleteProyecto(projectId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/proyectos/${projectId}`, {
      method: 'DELETE'
    });
  }

  public async logout(): Promise<void> {
    this.clearAuthToken();
    console.log('👋 Sesión cerrada, token eliminado');
  }

  // *** 🆕 NUEVOS MÉTODOS PARA DOCUMENTOS - AGREGADOS SIN ELIMINAR NADA ***
  
  /**
   * Obtiene el certificado de un usuario específico (ADMIN)
   * @param userId ID del usuario
   * @returns Documento en formato base64
   */
  public async getUserCertificate(userId: string): Promise<ApiResponse<string>> {
    console.log('📄 Obteniendo certificado para usuario:', userId);
    
    try {
      const url = `${this.API_BASE_URL}/admin/get-user-certificate?userId=${userId}`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo certificado',
          status: response.status
        };
      }
      
      // Para archivos, convertir a base64
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Certificado obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo certificado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo certificado',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Obtiene el documento de identidad de un usuario específico (ADMIN)
   * @param userId ID del usuario
   * @returns Documento en formato base64
   */
  public async getUserIdentityDocument(userId: string): Promise<ApiResponse<string>> {
    console.log('🆔 Obteniendo documento de identidad para usuario:', userId);
    
    try {
      const url = `${this.API_BASE_URL}/admin/get-user-identity-document?userId=${userId}`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo documento de identidad',
          status: response.status
        };
      }
      
      // Para archivos, convertir a base64
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Documento de identidad obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo documento de identidad:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo documento de identidad',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Obtiene el certificado del usuario autenticado actual
   * @returns Documento en formato base64
   */
  public async getCurrentUserCertificate(): Promise<ApiResponse<string>> {
    console.log('📄 Obteniendo certificado del usuario actual');
    
    try {
      const url = `${this.API_BASE_URL}/users/get-certificate`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo certificado del usuario actual',
          status: response.status
        };
      }
      
      // Para archivos, convertir a base64
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Certificado obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo certificado del usuario actual:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo certificado',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Carga todos los documentos de un usuario en paralelo
   * @param userId ID del usuario
   * @returns Objeto con todos los documentos disponibles
   */
  public async getAllUserDocuments(userId: string): Promise<{
    certificate?: string;
    identityDocument?: string;
    signedDocument?: string;
    errors: string[];
  }> {
    console.log('📂 Cargando todos los documentos para usuario:', userId);
    
    const documents: {
      certificate?: string;
      identityDocument?: string;
      signedDocument?: string;
      errors: string[];
    } = { errors: [] };

    // Cargar documentos en paralelo
    const promises = [
      this.getUserCertificate(userId),
      this.getUserIdentityDocument(userId),
      this.getCurrentUserCertificate() // Para documento firmado
    ];

    const [certificateResponse, identityResponse, signedResponse] = await Promise.allSettled(promises);

    // Procesar certificado
    if (certificateResponse.status === 'fulfilled' && certificateResponse.value.success && certificateResponse.value.data) {
      documents.certificate = certificateResponse.value.data;
    } else {
      const error = certificateResponse.status === 'fulfilled' 
        ? (certificateResponse.value.error || 'Error desconocido')
        : 'Error de conexión';
      documents.errors.push(`Certificado: ${error}`);
    }

    // Procesar documento de identidad
    if (identityResponse.status === 'fulfilled' && identityResponse.value.success && identityResponse.value.data) {
      documents.identityDocument = identityResponse.value.data;
    } else {
      const error = identityResponse.status === 'fulfilled' 
        ? (identityResponse.value.error || 'Error desconocido')
        : 'Error de conexión';
      documents.errors.push(`Documento de identidad: ${error}`);
    }

    // Procesar documento firmado
    if (signedResponse.status === 'fulfilled' && signedResponse.value.success && signedResponse.value.data) {
      documents.signedDocument = signedResponse.value.data;
    } else {
      const error = signedResponse.status === 'fulfilled' 
        ? (signedResponse.value.error || 'Error desconocido')
        : 'Error de conexión';
      documents.errors.push(`Documento firmado: ${error}`);
    }

    console.log('📋 Documentos cargados:', {
      certificate: !!documents.certificate,
      identityDocument: !!documents.identityDocument,
      signedDocument: !!documents.signedDocument,
      errorsCount: documents.errors.length
    });

    return documents;
  }

  /**
   * Envía observaciones junto con el rechazo de un proyecto
   * @param userId ID del usuario
   * @param observacion Texto de la observación
   * @returns Respuesta de la API
   */
  public async rechazarProyectoConObservacion(userId: string, observacion: string): Promise<ApiResponse<{ message: string }>> {
    console.log('❌ Rechazando proyecto con observación:', { userId, observacion: observacion.substring(0, 50) + '...' });
    
    return this.request<{ message: string }>(`/admin/reject/${userId}`, {
      method: 'POST',
      body: JSON.stringify({
        observacion: observacion.trim(),
        timestamp: new Date().toISOString()
      }),
    });
  }

  /**
   * Convierte datos base64 a URL de objeto para visualización
   * @param base64Data Datos en formato base64
   * @param mimeType Tipo MIME del archivo
   * @returns URL del objeto
   */
  public createObjectURL(base64Data: string, mimeType: string = 'application/pdf'): string {
    try {
      // Decodificar base64 a array de bytes
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creando URL del objeto:', error);
      throw new Error('No se pudo procesar el documento');
    }
  }

  /**
   * Descarga un archivo desde datos base64
   * @param base64Data Datos en formato base64
   * @param filename Nombre del archivo
   * @param mimeType Tipo MIME del archivo
   */
  public downloadFile(base64Data: string, filename: string, mimeType: string = 'application/pdf'): void {
    try {
      const url = this.createObjectURL(base64Data, mimeType);
      
      // Crear enlace temporal para descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL del objeto
      URL.revokeObjectURL(url);
      
      console.log('📥 Archivo descargado:', filename);
    } catch (error) {
      console.error('Error descargando archivo:', error);
      throw new Error('No se pudo descargar el documento');
    }
  }

  /**
   * Valida si los datos base64 son válidos
   * @param base64Data Datos a validar
   * @returns true si son válidos
   */
  public isValidBase64(base64Data: string): boolean {
    try {
      if (!base64Data || typeof base64Data !== 'string') {
        return false;
      }
      
      // Verificar formato base64 básico
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      return base64Regex.test(base64Data) && base64Data.length % 4 === 0;
    } catch {
      return false;
    }
  }

  /**
   * Verifica el estado del servidor
   * @returns Estado de conexión
   */
  public async checkServerStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Servidor no disponible:', error);
      return false;
    }
  }

  /**
   * Obtiene información del usuario actual
   * @returns Datos del usuario
   */
  public async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/users/me');
  }

  /**
   * Información de debug para desarrollo
   * @returns Estado actual del servicio
   */
  public getDebugInfo(): {
    isAuthenticated: boolean;
    hasToken: boolean;
    tokenPreview: string;
    baseURL: string;
    tokenExpired: boolean;
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: !!this.getAuthToken(),
      tokenPreview: this.getAuthToken() ? `${this.getAuthToken()!.substring(0, 20)}...` : 'No token',
      baseURL: this.API_BASE_URL,
      tokenExpired: this.isTokenExpired()
    };
  }

  /**
   * Log de información útil para debugging
   */
  public logDebugInfo(): void {
    console.group('🔍 ApiService Debug Info');
    console.log('Estado de autenticación:', this.isAuthenticated());
    console.log('Token presente:', !!this.getAuthToken());
    console.log('Token expirado:', this.isTokenExpired());
    console.log('URL base:', this.API_BASE_URL);
    const token = this.getAuthToken();
    if (token) {
      console.log('Token preview:', `${token.substring(0, 30)}...`);
    }
    console.groupEnd();
  }

  // *** MÉTODOS ESPECÍFICOS PARA NEGOCIOS ***

  /**
   * Obtiene la lista paginada de negocios públicos por categoría
   * @param page Número de página (base 0)
   * @param size Tamaño de página
   * @param category Categoría opcional para filtrar
   * @returns Lista paginada de negocios
   */
  public async getBusinessList(page: number = 0, size: number = 10, category?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: (page + 1).toString(), // La API usa páginas base 1
      size: size.toString(),
      ...(category && { category })
    });

    return this.request<any>(`/business/public-list-by-category?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Obtiene la lista de negocios pendientes de aprobación (ADMIN)
   * @param page Número de página (base 0)
   * @param size Tamaño de página
   * @returns Lista paginada de negocios pendientes
   */
  public async getPendingBusinessList(page: number = 0, size: number = 10): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: (page + 1).toString(), // La API usa páginas base 1
      size: size.toString(),
    });

    return this.request<any>(`/business/pending?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Aprueba un negocio (ADMIN)
   * @param businessId ID del negocio
   * @returns Respuesta de la API
   */
  public async approveBusiness(businessId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/business/approve/${businessId}`, {
      method: 'POST'
    });
  }

  /**
   * Rechaza un negocio (ADMIN)
   * @param businessId ID del negocio
   * @returns Respuesta de la API
   */
  public async rejectBusiness(businessId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/business/reject/${businessId}`, {
      method: 'POST'
    });
  }

  /**
   * Rechaza un negocio con observación (ADMIN)
   * @param businessId ID del negocio
   * @param observacion Texto de la observación
   * @returns Respuesta de la API
   */
  public async rejectBusinessWithObservation(businessId: number, observacion: string): Promise<ApiResponse<{ message: string }>> {
    console.log('❌ Rechazando negocio con observación:', { businessId, observacion: observacion.substring(0, 50) + '...' });
    
    return this.request<{ message: string }>(`/business/reject/${businessId}`, {
      method: 'POST',
      body: JSON.stringify({
        observacion: observacion.trim(),
        timestamp: new Date().toISOString()
      }),
    });
  }

  /**
   * Crea un nuevo negocio
   * @param businessData Datos del negocio
   * @returns Negocio creado
   */
  public async createBusiness(businessData: any): Promise<ApiResponse<any>> {
    return this.request<any>('/business/create', {
      method: 'POST',
      body: JSON.stringify(businessData)
    });
  }

  /**
   * Obtiene un negocio específico por ID
   * @param businessId ID del negocio
   * @returns Datos del negocio
   */
  public async getBusiness(businessId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/business/${businessId}`, {
      method: 'GET'
    });
  }

  /**
   * Actualiza un negocio existente
   * @param businessId ID del negocio
   * @param businessData Datos actualizados
   * @returns Negocio actualizado
   */
  public async updateBusiness(businessId: number, businessData: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/business/${businessId}`, {
      method: 'PUT',
      body: JSON.stringify(businessData)
    });
  }

  /**
   * Elimina un negocio
   * @param businessId ID del negocio
   * @returns Respuesta de eliminación
   */
  public async deleteBusiness(businessId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/business/${businessId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Obtiene las categorías de negocios disponibles
   * @returns Lista de categorías
   */
  public async getBusinessCategories(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/business/categories', {
      method: 'GET'
    });
  }

  /**
   * Busca negocios por texto
   * @param query Texto de búsqueda
   * @param page Número de página
   * @param size Tamaño de página
   * @returns Lista paginada de negocios
   */
  public async searchBusinesses(query: string, page: number = 0, size: number = 10): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      q: query,
      page: (page + 1).toString(),
      size: size.toString(),
    });

    return this.request<any>(`/business/search?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Obtiene estadísticas de negocios (ADMIN)
   * @returns Estadísticas generales
   */
  public async getBusinessStats(): Promise<ApiResponse<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }>> {
    return this.request<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    }>('/business/stats', {
      method: 'GET'
    });
  }

  /**
   * Descarga el documento de cédula/RUC de un negocio
   * @param businessId ID del negocio
   * @returns Documento en formato base64
   */
  public async getBusinessDocument(businessId: number): Promise<ApiResponse<string>> {
    console.log('📄 Obteniendo documento para negocio:', businessId);
    
    try {
      const url = `${this.API_BASE_URL}/business/${businessId}/cedula-document`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo documento',
          status: response.status
        };
      }
      
      // Para archivos, convertir a base64
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Documento obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo documento:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo documento',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Carga la imagen/logo de un negocio
   * @param businessId ID del negocio
   * @returns URL de la imagen
   */
  public async getBusinessLogo(businessId: number): Promise<ApiResponse<string>> {
    console.log('🖼️ Obteniendo logo para negocio:', businessId);
    
    try {
      const url = `${this.API_BASE_URL}/business/${businessId}/logo`;
      console.log(`🌐 Petición GET a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error obteniendo logo',
          status: response.status
        };
      }
      
      // Para imágenes, devolver la URL directamente o convertir a base64
      const arrayBuffer = await response.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      return {
        success: true,
        data: base64String,
        message: 'Logo obtenido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error obteniendo logo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo logo',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Sube un documento para un negocio
   * @param businessId ID del negocio
   * @param file Archivo a subir
   * @param documentType Tipo de documento ('cedula', 'logo', 'signature')
   * @returns Respuesta de la subida
   */
  public async uploadBusinessDocument(businessId: number, file: File, documentType: 'cedula' | 'logo' | 'signature'): Promise<ApiResponse<{ url: string }>> {
    console.log('📤 Subiendo documento para negocio:', { businessId, documentType, fileName: file.name });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      
      const url = `${this.API_BASE_URL}/business/${businessId}/upload-document`;
      console.log(`🌐 Petición POST a: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Más tiempo para subidas
      
      // Headers sin Content-Type para FormData
      const headers = { ...this.getHeaders() };
      delete headers['Content-Type'];
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formData,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.message || `HTTP ${response.status}: ${response.statusText}`,
          message: 'Error subiendo documento',
          status: response.status
        };
      }
      
      return {
        success: true,
        data: result,
        message: 'Documento subido exitosamente'
      };
      
    } catch (error) {
      console.error('💥 Error subiendo documento:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error subiendo documento',
        message: 'Error de conexión'
      };
    }
  }

  /**
   * Valida que un negocio existe y el usuario tiene permisos
   * @param businessId ID del negocio
   * @returns true si es válido
   */
  public async validateBusinessAccess(businessId: number): Promise<boolean> {
    try {
      const response = await this.getBusiness(businessId);
      return response.success;
    } catch (error) {
      console.error('Error validando acceso al negocio:', error);
      return false;
    }
  }

  /**
   * Obtiene todos los documentos de un negocio en paralelo
   * @param businessId ID del negocio
   * @returns Objeto con todos los documentos disponibles
   */
  public async getAllBusinessDocuments(businessId: number): Promise<{
    cedula?: string;
    logo?: string;
    signature?: string;
    errors: string[];
  }> {
    console.log('📂 Cargando todos los documentos para negocio:', businessId);
    
    const documents: {
      cedula?: string;
      logo?: string;
      signature?: string;
      errors: string[];
    } = { errors: [] };

    // Cargar documentos en paralelo
    const promises = [
      this.getBusinessDocument(businessId),
      this.getBusinessLogo(businessId),
      // Agregar más documentos según sea necesario
    ];

    const [cedulaResponse, logoResponse] = await Promise.allSettled(promises);

    // Procesar cédula
    if (cedulaResponse.status === 'fulfilled' && cedulaResponse.value.success && cedulaResponse.value.data) {
      documents.cedula = cedulaResponse.value.data;
    } else {
      const error = cedulaResponse.status === 'fulfilled' 
        ? (cedulaResponse.value.error || 'Error desconocido')
        : 'Error de conexión';
      documents.errors.push(`Cédula/RUC: ${error}`);
    }

    // Procesar logo
    if (logoResponse.status === 'fulfilled' && logoResponse.value.success && logoResponse.value.data) {
      documents.logo = logoResponse.value.data;
    } else {
      const error = logoResponse.status === 'fulfilled' 
        ? (logoResponse.value.error || 'Error desconocido')
        : 'Error de conexión';
      documents.errors.push(`Logo: ${error}`);
    }

    console.log('📋 Documentos de negocio cargados:', {
      cedula: !!documents.cedula,
      logo: !!documents.logo,
      errorsCount: documents.errors.length
    });

    return documents;
  }
  /**
 * Rechazar usuario con observación
 * @param userId ID del usuario
 * @param reason Razón del rechazo (observación)
 * @returns Promise con respuesta de la API
 */
async rechazarUsuario(userId: string, reason: string): Promise<ApiResponse<string>> {
  try {
    const token = this.getCurrentToken();
    
    if (!token) {
      console.error('❌ No hay token de autenticación');
      return {
        success: false,
        error: 'No hay token de autenticación',
        status: 401
      };
    }

    // Construir URL con parámetros query
    const baseUrl = 'http://34.10.172.54:8080';
    const url = new URL(`${baseUrl}/admin/reject/${userId}`);
    url.searchParams.append('reason', reason);

    console.log('🔄 Rechazando usuario:', {
      userId,
      reason: reason.substring(0, 50) + '...',
      url: url.toString()
    });

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('📡 Respuesta del servidor:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const textData = await response.text();
      console.log('📄 Respuesta en texto:', textData);
      data = { message: textData || 'Usuario rechazado exitosamente' };
    }

    if (response.ok) {
      console.log('✅ Usuario rechazado exitosamente:', data);
      return {
        success: true,
        data: data.data || data.message || 'Usuario rechazado exitosamente',
        message: data.message || 'Usuario rechazado exitosamente'
      };
    } else {
      console.error('❌ Error del servidor al rechazar usuario:', {
        status: response.status,
        data
      });

      let errorMessage = 'Error al rechazar usuario';
      
      if (response.status === 400) {
        errorMessage = data.message || 'El usuario ya está habilitado';
      } else if (response.status === 404) {
        errorMessage = data.message || 'Usuario no encontrado';
      } else if (response.status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
      } else if (response.status === 403) {
        errorMessage = 'No tiene permisos para rechazar usuarios';
      } else {
        errorMessage = data.message || data.error || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
        status: response.status,
        data
      };
    }

  } catch (error) {
    console.error('💥 Error de red al rechazar usuario:', error);
    
    let errorMessage = 'Error de conexión al rechazar usuario';
    
    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Error de conexión. Verifique que el servidor esté disponible.';
      } else if (error.message.includes('timeout') || error.message.includes('AbortError')) {
        errorMessage = 'La conexión tardó demasiado tiempo. Intente nuevamente.';
      } else {
        errorMessage = `Error de conexión: ${error.message}`;
      }
    }

    return {
      success: false,
      error: errorMessage,
      status: 0
    };
  }
}
}