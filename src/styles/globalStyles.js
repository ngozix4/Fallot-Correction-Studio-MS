import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const globalStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAround: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },

  // Typography
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212121',
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  body: {
    fontSize: 16,
    color: '#424242',
  },
  bodySmall: {
    fontSize: 14,
    color: '#757575',
  },
  caption: {
    fontSize: 12,
    color: '#9E9E9E',
  },

  // Spacing
  mb1: { marginBottom: 4 },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 12 },
  mb4: { marginBottom: 16 },
  mb5: { marginBottom: 20 },
  mb6: { marginBottom: 24 },

  mt1: { marginTop: 4 },
  mt2: { marginTop: 8 },
  mt3: { marginTop: 12 },
  mt4: { marginTop: 16 },
  mt5: { marginTop: 20 },
  mt6: { marginTop: 24 },

  ml1: { marginLeft: 4 },
  ml2: { marginLeft: 8 },
  ml3: { marginLeft: 12 },
  ml4: { marginLeft: 16 },
  ml5: { marginLeft: 20 },
  ml6: { marginLeft: 24 },

  mr1: { marginRight: 4 },
  mr2: { marginRight: 8 },
  mr3: { marginRight: 12 },
  mr4: { marginRight: 16 },
  mr5: { marginRight: 20 },
  mr6: { marginRight: 24 },

  mx1: { marginHorizontal: 4 },
  mx2: { marginHorizontal: 8 },
  mx3: { marginHorizontal: 12 },
  mx4: { marginHorizontal: 16 },
  mx5: { marginHorizontal: 20 },
  mx6: { marginHorizontal: 24 },

  my1: { marginVertical: 4 },
  my2: { marginVertical: 8 },
  my3: { marginVertical: 12 },
  my4: { marginVertical: 16 },
  my5: { marginVertical: 20 },
  my6: { marginVertical: 24 },

  p1: { padding: 4 },
  p2: { padding: 8 },
  p3: { padding: 12 },
  p4: { padding: 16 },
  p5: { padding: 20 },
  p6: { padding: 24 },

  px1: { paddingHorizontal: 4 },
  px2: { paddingHorizontal: 8 },
  px3: { paddingHorizontal: 12 },
  px4: { paddingHorizontal: 16 },
  px5: { paddingHorizontal: 20 },
  px6: { paddingHorizontal: 24 },

  py1: { paddingVertical: 4 },
  py2: { paddingVertical: 8 },
  py3: { paddingVertical: 12 },
  py4: { paddingVertical: 16 },
  py5: { paddingVertical: 20 },
  py6: { paddingVertical: 24 },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Shadows
  shadowSm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  shadowMd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shadowLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonSecondary: {
    backgroundColor: '#F0F0FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  buttonTextSecondary: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonOutline: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonTextOutline: {
    color: '#424242',
    fontSize: 16,
    fontWeight: '600',
  },

  // Inputs
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212121',
  },

  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },

  // Empty States
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
    textAlign: 'center',
  },
});