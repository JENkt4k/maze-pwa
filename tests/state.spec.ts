import { buildShareURL, parseFromURL, parseSaved, parseSettings, validateSettings } from '@src/app/state';

const params = {width:19,height:13,seed:42,g:.301,b:.15,tau:.4};
test.each(['%', '%25', '%E0%A4%A', '%FF', ''])('malformed marker %s never crashes startup', marker => {
  expect(() => parseFromURL('?start=' + marker)).not.toThrow();
});
test('empty and compound markers and precise parameters survive sharing', () => {
  for (const marker of [null, '👨‍👩‍👧‍👦', '%25', '%', 'A&B']) {
    const url = buildShareURL('https://example.test/maze/?unrelated=ok', {...params,startIcon:marker,goalIcon:null});
    expect(parseFromURL(new URL(url).search)).toEqual({...params,startIcon:marker,goalIcon:null});
    expect(new URL(url).searchParams.get('unrelated')).toBe('ok');
  }
});
test('legacy double encoded emoji links still load', () => {
  const q = new URLSearchParams({start:encodeURIComponent('🚀')});
  expect(parseFromURL('?' + q)).toEqual({startIcon:'🚀'});
  expect(parseFromURL('?start=%25')).toEqual({startIcon:'%'});
});
test('image markers remain local and cannot inflate shared links', () => {
  const url = buildShareURL('https://example.test/', {...params,startIcon:'data:image/png;base64,AAAA',goalIcon:null});
  expect(parseFromURL(new URL(url).search)).toMatchObject({startIcon:null,goalIcon:null});
});
test('settings validate types, solver preferences, and numeric bounds', () => {
  expect(validateSettings({width:1000,height:8.8,g:'oops',b:Infinity,tau:-4,seed:42.5,controlsOpen:'yes',lockSize:true,animateDFS:false,dfsSegMs:0,lingerMs:1e9,solverEnabled:true,solverAlgorithm:'astar',solverStepMs:999}))
    .toEqual({width:41,height:9,tau:0,seed:42,dfsSegMs:10,lingerMs:5000,solverStepMs:250,lockSize:true,animateDFS:false,solverEnabled:true,solverAlgorithm:'astar'});
  expect(validateSettings({solverAlgorithm:'wall-follower'})).toEqual({});
  expect(parseSettings('{')).toEqual({});
  expect(parseSettings('null')).toEqual({});
  expect(parseSettings('[]')).toEqual({});
});
test('saved records preserve markers and accept legacy records while dropping corrupt entries', () => {
  const old = {id:'old',name:'Old maze',params,createdAt:1};
  const current = {id:'new',name:'New maze',params:{...params,startIcon:null,goalIcon:'🏁'},createdAt:2};
  expect(parseSaved(JSON.stringify([old,current,old,null,{}, {...old,id:'bad',params:{g:1}}]))).toEqual([old,current]);
  expect(parseSaved('{}')).toEqual([]);
  expect(parseSaved('{')).toEqual([]);
});
