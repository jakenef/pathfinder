import { supabase } from '../lib/supabase';
import type { Major, Career } from '../types';

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

export async function getCareersForMajor(majorId: string): Promise<Career[]> {
  try {
    const { data, error } = await supabase
      .from('careers')
      .select('*')
      .contains('related_major_ids', [majorId]);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching careers:', error);
    return [];
  }
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
