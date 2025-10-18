import { supabase } from '../lib/supabase';
import type { Major, Career } from '../types';
import { generateCareerSuggestions } from './openaiService';

export async function getMajors(limit: number = 50): Promise<Major[]> {
  try {
    // Use general_majors table directly (majors table doesn't exist)
    const result = await supabase
      .from('general_majors')
      .select('*')
      .limit(limit);

    if (result.error) throw result.error;

    // Map general_majors structure to Major interface
    const mappedData: Major[] = (result.data || []).map((gm: any) => ({
      id: gm.cip_code,
      name: gm.major_title,
      description: gm.major_summary || '',
      key_skills: [],
      personality_traits: [],
      values_alignment: [],
      typical_coursework: '',
      created_at: new Date().toISOString(),
    }));

    return mappedData;
  } catch (error) {
    console.error('Error fetching majors:', error);
    return [];
  }
}

export async function getMajorById(id: string): Promise<Major | null> {
  try {
    const { data, error } = await supabase
      .from('majors')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching major:', error);
    return null;
  }
}

export async function getCareersForMajor(majorId: string, majorName: string, majorDescription?: string): Promise<Career[]> {
  // Generate AI-based career suggestions using OpenAI
  const aiCareers = await generateCareerSuggestions(majorName, majorDescription || '');

  const careers: Career[] = aiCareers.map((aiCareer, index) => ({
    id: `${majorId}-career-${index + 1}`,
    name: aiCareer.name,
    description: aiCareer.description,
    related_major_ids: [majorId],
    salary_range: ['$50,000 - $80,000', '$55,000 - $90,000', '$60,000 - $100,000'][index] || '$50,000 - $90,000',
    job_outlook: ['Growing demand', 'Excellent opportunities', 'Strong growth projected'][index] || 'Positive outlook',
    required_skills: [
      ['Problem solving', 'Communication', 'Technical expertise'],
      ['Analytical thinking', 'Creativity', 'Leadership'],
      ['Strategic thinking', 'Collaboration', 'Innovation'],
    ][index] || ['Critical thinking', 'Communication', 'Adaptability'],
    work_environment: [
      'Professional setting with collaborative teams',
      'Dynamic environment with growth potential',
      'Varied settings with advancement opportunities',
    ][index] || 'Professional environment',
    next_steps: 'Gain relevant experience through internships and coursework',
    created_at: new Date().toISOString(),
  }));

  return careers;
}

export async function getAllCareers(limit: number = 20): Promise<Career[]> {
  try {
    const { data, error } = await supabase
      .from('careers')
      .select('*')
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching careers:', error);
    return [];
  }
}
