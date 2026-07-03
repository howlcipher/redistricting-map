import fs from 'fs';
import path from 'path';

async function fetchHouseMakeup() {
    try {
        console.log('Fetching House composition from GovTrack...');
        const res = await fetch('https://www.govtrack.us/api/v2/role?current=true&role_type=representative&limit=500');
        const data = await res.json();
        
        let dem = 0, rep = 0, ind = 0, vac = 0;
        data.objects.forEach(obj => {
            const s = obj.state;
            if (s !== 'DC' && s !== 'PR' && s !== 'GU' && s !== 'VI' && s !== 'AS' && s !== 'MP') {
                if (obj.party === 'Democrat') dem++;
                else if (obj.party === 'Republican') rep++;
                else if (obj.party === 'Independent') ind++;
            }
        });
        vac = 435 - (dem + rep + ind);
        
        const makeup = { dem, rep, ind, vac, last_updated: new Date().toISOString() };
        
        const destPath = path.join(process.cwd(), 'public', 'house_makeup.json');
        fs.writeFileSync(destPath, JSON.stringify(makeup, null, 2));
        
        console.log('Saved house_makeup.json:', makeup);
    } catch (e) {
        console.error('Failed to fetch house makeup:', e);
        process.exit(1);
    }
}

fetchHouseMakeup();
