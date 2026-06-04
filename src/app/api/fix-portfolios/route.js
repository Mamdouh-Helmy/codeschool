// app/api/fix-portfolios/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Portfolio from '../../models/Portfolio';
import User from '../../models/User';

export async function GET(req) {
  // حماية بسيطة
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.JWT_SIGN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const users = await User.find({});
    const portfolios = await Portfolio.find({}, { userId: 1 });
    
    const usersWithPortfolio = new Set(portfolios.map(p => p.userId.toString()));
    const usersWithout = users.filter(u => !usersWithPortfolio.has(u._id.toString()));

    console.log(`Users without portfolio: ${usersWithout.length}`);

    const results = [];

    for (const user of usersWithout) {
      const isInstructor = user.role === 'instructor';

      try {
        const portfolio = await Portfolio.create({
          userId: user._id,
          title: `${user.name}'s ${isInstructor ? 'Teaching ' : ''}Portfolio`,
          description: '',
          skills: isInstructor ? [
            { name: 'Teaching', level: 85, category: 'Education', icon: '👨‍🏫' },
            { name: 'Curriculum Design', level: 80, category: 'Education', icon: '📚' },
            { name: 'Student Engagement', level: 90, category: 'Education', icon: '🎯' },
          ] : [
            { name: 'JavaScript', level: 75, category: 'Frontend', icon: '🟨' },
            { name: 'React', level: 70, category: 'Frontend', icon: '⚛️' },
            { name: 'Node.js', level: 65, category: 'Backend', icon: '🟢' },
            { name: 'HTML/CSS', level: 85, category: 'Frontend', icon: '🎨' },
          ],
          projects: [{
            title: isInstructor ? 'Interactive Learning Platform' : 'Portfolio Website',
            description: isInstructor
              ? 'Developed engaging online courses with interactive content.'
              : 'A modern portfolio website to showcase my work and skills.',
            technologies: isInstructor
              ? ['Education Technology', 'E-Learning']
              : ['Next.js', 'React', 'Tailwind CSS'],
            featured: true,
            startDate: new Date(),
            endDate: new Date(),
            status: 'completed',
            images: [],
          }],
          certificates: [],
          socialLinks: {
            github: `https://github.com/${user.username || ''}`,
            linkedin: `https://linkedin.com/in/${user.username || ''}`,
            twitter: `https://twitter.com/${user.username || ''}`,
          },
          contactInfo: { email: '', phone: '', location: 'Add your location' },
          isPublished: true,
          views: 0,
          settings: { theme: 'dark', layout: 'standard' },
        });

        results.push({ name: user.name, role: user.role, status: 'created', portfolioId: portfolio._id });
      } catch (err) {
        results.push({ name: user.name, role: user.role, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      alreadyHavePortfolio: usersWithPortfolio.size,
      fixed: results.filter(r => r.status === 'created').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}