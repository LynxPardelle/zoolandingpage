import { PLATFORM_ID, REQUEST, REQUEST_CONTEXT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProtectedOriginService } from './protected-origin.service';

describe('ProtectedOriginService asset projection',()=>{
  const origin='https://admin.example.test';
  const assetUrls={'/fonts/editorial.woff2':'/browser/abcdef0123456789.editorial.woff2'};
  afterEach(()=>TestBed.resetTestingModule());
  function service(host=origin,map:unknown=assetUrls) {
    TestBed.configureTestingModule({providers:[{provide:PLATFORM_ID,useValue:'server'},
      {provide:REQUEST,useValue:new Request(host+'/admin/journal')},
      {provide:REQUEST_CONTEXT,useValue:{protectedOrigin:{origin,domain:'example.test',originRole:'protected-admin',assetUrls:map}}}]});
    return TestBed.inject(ProtectedOriginService);
  }
  it('retains only the verified SSR asset map through hydration',()=>{
    const value=service();
    expect(value.context?.assetUrls).toEqual(assetUrls);
  });
  it('denies mismatched hosts and malformed maps instead of installing browser authority',()=>{
    expect(service('https://admin.example.test.attacker.test').context).toBeNull();
    TestBed.resetTestingModule();
    expect(service(origin,{'/fonts/editorial.woff2':'https://other.test/font.woff2'}).context).toBeNull();
  });
});
