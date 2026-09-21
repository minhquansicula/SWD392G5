import apiClient from './apiClient';

export interface CourseLecturer {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  lecturers?: CourseLecturer[];
  lecturerCount?: number;
}

export interface CreateCourseRequest {
  courseCode: string;
  courseName: string;
}

export interface UpdateCourseRequest {
  courseCode: string;
  courseName: string;
}

/**
 * Fetch all courses
 * GET /api/courses
 */
export async function getCourses(): Promise<Course[]> {
  try {
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      data: Course[];
    }>('/courses');

    return response.data?.data || [];
  } catch (err: any) {
    console.error('Error fetching courses:', err);
    throw new Error(err.response?.data?.message || 'Không thể tải danh sách môn học.');
  }
}

/**
 * Admin: Create new course
 * POST /api/admin/courses
 */
export async function createCourse(data: CreateCourseRequest): Promise<Course> {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: Course;
    }>('/admin/courses', {
      courseCode: data.courseCode.trim().toUpperCase(),
      courseName: data.courseName.trim(),
    });

    return response.data.data;
  } catch (err: any) {
    console.error('Error creating course:', err);
    throw new Error(err.response?.data?.message || 'Không thể tạo môn học mới.');
  }
}

/**
 * Admin: Update course
 * PUT /api/admin/courses/{id}
 */
export async function updateCourse(id: string, data: UpdateCourseRequest): Promise<Course> {
  try {
    const response = await apiClient.put<{
      success: boolean;
      message: string;
      data: Course;
    }>(`/admin/courses/${id}`, {
      courseCode: data.courseCode.trim().toUpperCase(),
      courseName: data.courseName.trim(),
    });

    return response.data.data;
  } catch (err: any) {
    console.error('Error updating course:', err);
    throw new Error(err.response?.data?.message || 'Không thể cập nhật môn học.');
  }
}

/**
 * Admin: Delete course
 * DELETE /api/admin/courses/{id}
 */
export async function deleteCourse(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/admin/courses/${id}`);
    return true;
  } catch (err: any) {
    console.error('Error deleting course:', err);
    throw new Error(err.response?.data?.message || 'Không thể xóa môn học.');
  }
}

/**
 * Get lecturers assigned to course
 * GET /api/courses/{id}/lecturers
 */
export async function getCourseLecturers(courseId: string): Promise<CourseLecturer[]> {
  try {
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      data: CourseLecturer[];
    }>(`/courses/${courseId}/lecturers`);

    return response.data?.data || [];
  } catch (err: any) {
    console.error('Error fetching course lecturers:', err);
    throw new Error(err.response?.data?.message || 'Không thể tải danh sách giảng viên phụ trách.');
  }
}

/**
 * Admin: Assign lecturers to course
 * POST /api/admin/courses/{id}/lecturers
 */
export async function assignLecturersToCourse(courseId: string, lecturerIds: string[]): Promise<Course> {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: Course;
    }>(`/admin/courses/${courseId}/lecturers`, {
      lecturerIds,
    });

    return response.data.data;
  } catch (err: any) {
    console.error('Error assigning lecturers:', err);
    throw new Error(err.response?.data?.message || 'Không thể phân công giảng viên.');
  }
}

/**
 * Admin: Remove lecturer from course
 * DELETE /api/admin/courses/{id}/lecturers/{lecturerId}
 */
export async function removeLecturerFromCourse(courseId: string, lecturerId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/admin/courses/${courseId}/lecturers/${lecturerId}`);
    return true;
  } catch (err: any) {
    console.error('Error removing lecturer from course:', err);
    throw new Error(err.response?.data?.message || 'Không thể gỡ giảng viên khỏi môn học.');
  }
}

