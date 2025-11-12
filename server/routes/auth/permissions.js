const express = require('express');
const router = express.Router();
const { Permission, Role, RolePermission, UserPermission, User } = require('../../models');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { Op } = require('sequelize');

/**
 * GET /api/auth/permissions
 * Get all permissions (resources) - admin only
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'key', 'name', 'displayName', 'description', 'category', 'isActive']
    });

    res.json({
      permissions: permissions.map(p => ({
        id: p.id,
        key: p.key, // Legacy
        name: p.name,
        displayName: p.displayName,
        description: p.description,
        category: p.category,
        isActive: p.isActive
      }))
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/roles
 * Get all roles
 */
router.get('/roles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const roles = await Role.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'displayName', 'description', 'isActive']
    });

    res.json({
      roles: roles.map(r => r.toJSON())
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/permissions/role/:roleIdOrName
 * Get permissions for a specific role (by roleId or role name for backward compatibility)
 */
router.get('/role/:roleIdOrName', authenticateToken, async (req, res) => {
  try {
    const { roleIdOrName } = req.params;
    const roleIdNum = parseInt(roleIdOrName);
    
    let role;
    let roleId;
    
    // Check if it's a number (roleId) or a string (role name)
    if (!isNaN(roleIdNum)) {
      // It's a numeric roleId
      role = await Role.findByPk(roleIdNum);
      roleId = roleIdNum;
    } else {
      // It's a role name (backward compatibility)
      role = await Role.findOne({ where: { name: roleIdOrName } });
      if (role) {
        roleId = role.id;
      }
    }
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Users can only view their own role permissions unless admin
    const user = await User.findByPk(req.user.id);
    if (req.user.role !== 'admin' && user.roleId !== roleId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const rolePermissions = await RolePermission.findAll({
      where: { roleId },
      include: [{
        model: Permission,
        attributes: ['id', 'key', 'name', 'displayName', 'description', 'category']
      }],
      order: [[Permission, 'category', 'ASC'], [Permission, 'name', 'ASC']]
    });

    res.json({
      role: {
        id: role.id,
        name: role.name,
        displayName: role.displayName
      },
      permissions: rolePermissions.map(rp => ({
        id: rp.Permission.id,
        key: rp.Permission.key,
        name: rp.Permission.name,
        displayName: rp.Permission.displayName,
        description: rp.Permission.description,
        category: rp.Permission.category,
        canCreate: rp.canCreate || false,
        canRead: rp.canRead || false,
        canUpdate: rp.canUpdate || false,
        canDelete: rp.canDelete || false
      }))
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/permissions/me
 * Get all permissions for the current logged-in user (role + user-specific) with CRUD flags
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = req.user;

    // Get user's role ID
    let roleId = null;
    if (user.roleId) {
      roleId = user.roleId;
    } else {
      // Find role by name if roleId not set
      const role = await Role.findOne({ where: { name: user.role } });
      if (role) roleId = role.id;
    }

    // Get all active permissions (resources)
    const allResources = await Permission.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'displayName', 'description', 'category']
    });

    // Get role permissions with CRUD flags
    const rolePermissions = roleId ? await RolePermission.findAll({
      where: { roleId },
      include: [{
        model: Permission,
        attributes: ['id', 'name', 'displayName', 'description', 'category']
      }]
    }) : [];

    // Get user-specific permissions with CRUD flags
    const userPermissions = await UserPermission.findAll({
      where: { userId },
      include: [{
        model: Permission,
        attributes: ['id', 'name', 'displayName', 'description', 'category']
      }]
    });

    // Create maps for quick lookup
    const rolePermMap = new Map();
    rolePermissions.forEach(rp => {
      rolePermMap.set(rp.Permission.id, {
        canCreate: rp.canCreate,
        canRead: rp.canRead,
        canUpdate: rp.canUpdate,
        canDelete: rp.canDelete
      });
    });

    const userPermMap = new Map();
    userPermissions.forEach(up => {
      userPermMap.set(up.Permission.id, {
        canCreate: up.canCreate,
        canRead: up.canRead,
        canUpdate: up.canUpdate,
        canDelete: up.canDelete
      });
    });

    // Build permissions array with CRUD flags (user overrides role)
    const permissions = allResources.map(resource => {
      const rolePerm = rolePermMap.get(resource.id);
      const userPerm = userPermMap.get(resource.id);
      
      // User permissions override role permissions
      const crud = userPerm || rolePerm || {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false
      };

      return {
        id: resource.id,
        name: resource.name,
        displayName: resource.displayName,
        description: resource.description,
        category: resource.category,
        canCreate: crud.canCreate || false,
        canRead: crud.canRead || false,
        canUpdate: crud.canUpdate || false,
        canDelete: crud.canDelete || false,
        source: userPerm ? 'user' : (rolePerm ? 'role' : 'none')
      };
    });

    // For backward compatibility, also return permission keys (legacy format)
    const permissionKeys = permissions
      .filter(p => p.canRead || p.canCreate || p.canUpdate || p.canDelete)
      .map(p => p.name);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      permissions: permissionKeys, // Legacy format
      permissionsDetail: permissions, // New CRUD format
      crud: permissions // Alias for easier access
    });
  } catch (error) {
    console.error('Get current user permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/permissions/user/:userId
 * Get all permissions for a user (role + user-specific)
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);

    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid userId. Must be a number.' });
    }

    // Users can only view their own permissions unless admin
    if (req.user.role !== 'admin' && req.user.id !== userIdNum) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await User.findByPk(userIdNum);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's role ID
    let roleId = null;
    if (user.roleId) {
      roleId = user.roleId;
    } else {
      const role = await Role.findOne({ where: { name: user.role } });
      if (role) roleId = role.id;
    }

    // Get role permissions using roleId
    const rolePermissions = roleId ? await RolePermission.findAll({
      where: { roleId },
      include: [{
        model: Permission,
        attributes: ['id', 'key', 'name', 'displayName', 'description', 'category']
      }]
    }) : [];

    // Get all active permissions (resources) - we need to return ALL permissions, not just role/user ones
    const allResources = await Permission.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'key', 'name', 'displayName', 'description', 'category']
    });

    // Get user-specific permissions
    const userPermissions = await UserPermission.findAll({
      where: { userId: userIdNum },
      include: [{
        model: Permission,
        attributes: ['id', 'key', 'name', 'displayName', 'description', 'category']
      }]
    });

    // Create maps for quick lookup
    const rolePermMap = new Map();
    rolePermissions.forEach(rp => {
      rolePermMap.set(rp.Permission.id, {
        canCreate: rp.canCreate || false,
        canRead: rp.canRead || false,
        canUpdate: rp.canUpdate || false,
        canDelete: rp.canDelete || false
      });
    });

    const userPermMap = new Map();
    userPermissions.forEach(up => {
      userPermMap.set(up.Permission.id, {
        canCreate: up.canCreate || false,
        canRead: up.canRead || false,
        canUpdate: up.canUpdate || false,
        canDelete: up.canDelete || false
      });
    });

    // Build permissions array with ALL permissions (user overrides role)
    const allPermissions = allResources.map(resource => {
      const rolePerm = rolePermMap.get(resource.id);
      const userPerm = userPermMap.get(resource.id);
      
      // User permissions override role permissions
      const crud = userPerm || rolePerm || {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false
      };

      const granted = crud.canRead || crud.canCreate || crud.canUpdate || crud.canDelete;
      
      return {
        id: resource.id,
        key: resource.key,
        name: resource.name || resource.key,
        displayName: resource.displayName || resource.name || resource.key,
        description: resource.description,
        category: resource.category,
        granted: granted,
        canCreate: crud.canCreate,
        canRead: crud.canRead,
        canUpdate: crud.canUpdate,
        canDelete: crud.canDelete,
        source: userPerm ? 'user' : (rolePerm ? 'role' : 'none')
      };
    });

    // Sort by category and name
    allPermissions.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return (a.name || a.key || '').localeCompare(b.name || b.key || '');
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      permissions: allPermissions
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/permissions/user/:userId
 * Grant or deny a permission to a user using CRUD flags (admin only)
 * This endpoint is deprecated - use /user/:userId/crud instead
 */
router.post('/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionId, canCreate, canRead, canUpdate, canDelete } = req.body;

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid userId. Must be a number.' });
    }

    if (!permissionId) {
      return res.status(400).json({ error: 'permissionId is required' });
    }

    const permissionIdNum = parseInt(permissionId);
    if (isNaN(permissionIdNum)) {
      return res.status(400).json({ error: 'Invalid permissionId. Must be a number.' });
    }

    const user = await User.findByPk(userIdNum);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permission = await Permission.findByPk(permissionIdNum);
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    const [userPermission, created] = await UserPermission.findOrCreate({
      where: {
        userId: userIdNum,
        permissionId: permissionIdNum
      },
      defaults: {
        userId: userIdNum,
        permissionId: permissionIdNum,
        canCreate: canCreate || false,
        canRead: canRead !== undefined ? canRead : true, // Default to read if not specified
        canUpdate: canUpdate || false,
        canDelete: canDelete || false
      }
    });

    if (!created) {
      await userPermission.update({
        canCreate: canCreate !== undefined ? canCreate : userPermission.canCreate,
        canRead: canRead !== undefined ? canRead : userPermission.canRead,
        canUpdate: canUpdate !== undefined ? canUpdate : userPermission.canUpdate,
        canDelete: canDelete !== undefined ? canDelete : userPermission.canDelete
      });
    }

    res.json({
      message: 'User permission updated successfully',
      userPermission: {
        id: userPermission.id,
        userId: userPermission.userId,
        permissionId: userPermission.permissionId,
        canCreate: userPermission.canCreate,
        canRead: userPermission.canRead,
        canUpdate: userPermission.canUpdate,
        canDelete: userPermission.canDelete
      }
    });
  } catch (error) {
    console.error('Grant/deny permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/auth/permissions/user/:userId/:permissionId
 * Remove a user-specific permission (admin only)
 */
router.delete('/user/:userId/:permissionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, permissionId } = req.params;

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid userId. Must be a number.' });
    }

    const permissionIdNum = parseInt(permissionId);
    if (isNaN(permissionIdNum)) {
      return res.status(400).json({ error: 'Invalid permissionId. Must be a number.' });
    }

    const userPermission = await UserPermission.findOne({
      where: {
        userId: userIdNum,
        permissionId: permissionIdNum
      }
    });

    if (!userPermission) {
      return res.status(404).json({ error: 'User permission not found' });
    }

    await userPermission.destroy();

    res.json({
      message: 'User permission removed successfully',
      note: 'User will now use role permissions'
    });
  } catch (error) {
    console.error('Remove user permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/permissions/role/:roleIdOrName
 * Grant a permission to a role using CRUD flags (admin only)
 * Supports both roleId (number) and role name (string) for backward compatibility
 * This endpoint is deprecated - use /role/:roleId/crud instead
 */
router.post('/role/:roleIdOrName', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { roleIdOrName } = req.params;
    const { permissionId, canCreate, canRead, canUpdate, canDelete } = req.body;

    const roleIdNum = parseInt(roleIdOrName);
    let role;
    let roleId;
    
    // Check if it's a number (roleId) or a string (role name)
    if (!isNaN(roleIdNum)) {
      // It's a numeric roleId
      role = await Role.findByPk(roleIdNum);
      roleId = roleIdNum;
    } else {
      // It's a role name (backward compatibility)
      role = await Role.findOne({ where: { name: roleIdOrName } });
      if (role) {
        roleId = role.id;
      }
    }

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (!permissionId) {
      return res.status(400).json({ error: 'permissionId is required' });
    }

    const permissionIdNum = parseInt(permissionId);
    if (isNaN(permissionIdNum)) {
      return res.status(400).json({ error: 'Invalid permissionId. Must be a number.' });
    }

    const permission = await Permission.findByPk(permissionIdNum);
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    const [rolePermission, created] = await RolePermission.findOrCreate({
      where: {
        roleId: roleId,
        permissionId: permissionIdNum
      },
      defaults: {
        roleId: roleId,
        permissionId: permissionIdNum,
        canCreate: canCreate || false,
        canRead: canRead !== undefined ? canRead : true, // Default to read if not specified
        canUpdate: canUpdate || false,
        canDelete: canDelete || false
      }
    });

    if (!created) {
      await rolePermission.update({
        canCreate: canCreate !== undefined ? canCreate : rolePermission.canCreate,
        canRead: canRead !== undefined ? canRead : rolePermission.canRead,
        canUpdate: canUpdate !== undefined ? canUpdate : rolePermission.canUpdate,
        canDelete: canDelete !== undefined ? canDelete : rolePermission.canDelete
      });
    }

    res.json({
      message: 'Permission granted to role successfully',
      rolePermission: {
        id: rolePermission.id,
        roleId: rolePermission.roleId,
        permissionId: rolePermission.permissionId,
        canCreate: rolePermission.canCreate,
        canRead: rolePermission.canRead,
        canUpdate: rolePermission.canUpdate,
        canDelete: rolePermission.canDelete
      }
    });
  } catch (error) {
    console.error('Grant role permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/auth/permissions/role/:roleIdOrName/:permissionId
 * Revoke a permission from a role (admin only)
 * Supports both roleId (number) and role name (string) for backward compatibility
 */
router.delete('/role/:roleIdOrName/:permissionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { roleIdOrName, permissionId } = req.params;

    const roleIdNum = parseInt(roleIdOrName);
    let role;
    let roleId;
    
    // Check if it's a number (roleId) or a string (role name)
    if (!isNaN(roleIdNum)) {
      // It's a numeric roleId
      role = await Role.findByPk(roleIdNum);
      roleId = roleIdNum;
    } else {
      // It's a role name (backward compatibility)
      role = await Role.findOne({ where: { name: roleIdOrName } });
      if (role) {
        roleId = role.id;
      }
    }

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const permissionIdNum = parseInt(permissionId);
    if (isNaN(permissionIdNum)) {
      return res.status(400).json({ error: 'Invalid permissionId. Must be a number.' });
    }

    const rolePermission = await RolePermission.findOne({
      where: {
        roleId: roleId,
        permissionId: permissionIdNum
      }
    });

    if (!rolePermission) {
      return res.status(404).json({ error: 'Role permission not found' });
    }

    await rolePermission.destroy();

    res.json({
      message: 'Permission revoked from role successfully'
    });
  } catch (error) {
    console.error('Revoke role permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/permissions/role/:roleId/crud
 * Get CRUD permissions for a specific role
 */
router.get('/role/:roleId/crud', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { roleId } = req.params;
    const roleIdNum = parseInt(roleId);
    
    if (isNaN(roleIdNum)) {
      return res.status(400).json({ error: 'Invalid roleId. Must be a number.' });
    }
    
    const role = await Role.findByPk(roleIdNum);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const rolePermissions = await RolePermission.findAll({
      where: { roleId: roleIdNum },
      include: [{
        model: Permission,
        attributes: ['id', 'name', 'displayName', 'description', 'category']
      }],
      order: [[Permission, 'category', 'ASC'], [Permission, 'name', 'ASC']]
    });

    res.json({
      role: {
        id: role.id,
        name: role.name,
        displayName: role.displayName
      },
      permissions: rolePermissions.map(rp => ({
        id: rp.Permission.id,
        name: rp.Permission.name,
        displayName: rp.Permission.displayName,
        description: rp.Permission.description,
        category: rp.Permission.category,
        canCreate: rp.canCreate,
        canRead: rp.canRead,
        canUpdate: rp.canUpdate,
        canDelete: rp.canDelete
      }))
    });
  } catch (error) {
    console.error('Get role CRUD permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/permissions/role/:roleId/crud
 * Update CRUD permissions for a role
 */
router.post('/role/:roleId/crud', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissionId, canCreate, canRead, canUpdate, canDelete } = req.body;

    const roleIdNum = parseInt(roleId);
    if (isNaN(roleIdNum)) {
      return res.status(400).json({ error: 'Invalid roleId. Must be a number.' });
    }

    if (!permissionId) {
      return res.status(400).json({ error: 'permissionId is required' });
    }

    const permissionIdNum = parseInt(permissionId);
    if (isNaN(permissionIdNum)) {
      return res.status(400).json({ error: 'Invalid permissionId. Must be a number.' });
    }

    const role = await Role.findByPk(roleIdNum);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const permission = await Permission.findByPk(permissionIdNum);
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    const [rolePermission, created] = await RolePermission.findOrCreate({
      where: {
        roleId: roleIdNum,
        permissionId: permissionIdNum
      },
      defaults: {
        roleId: roleIdNum,
        permissionId: permissionIdNum,
        canCreate: canCreate || false,
        canRead: canRead || false,
        canUpdate: canUpdate || false,
        canDelete: canDelete || false
      }
    });

    if (!created) {
      await rolePermission.update({
        canCreate: canCreate !== undefined ? canCreate : rolePermission.canCreate,
        canRead: canRead !== undefined ? canRead : rolePermission.canRead,
        canUpdate: canUpdate !== undefined ? canUpdate : rolePermission.canUpdate,
        canDelete: canDelete !== undefined ? canDelete : rolePermission.canDelete
      });
    }

    res.json({
      message: 'Role CRUD permissions updated successfully',
      rolePermission: {
        id: rolePermission.id,
        roleId: rolePermission.roleId,
        permissionId: rolePermission.permissionId,
        canCreate: rolePermission.canCreate,
        canRead: rolePermission.canRead,
        canUpdate: rolePermission.canUpdate,
        canDelete: rolePermission.canDelete
      }
    });
  } catch (error) {
    console.error('Update role CRUD permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/permissions/user/:userId/crud
 * Get CRUD permissions for a user
 */
router.get('/user/:userId/crud', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);

    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid userId. Must be a number.' });
    }

    // Users can only view their own permissions unless admin
    if (req.user.role !== 'admin' && req.user.id !== userIdNum) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await User.findByPk(userIdNum);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's role permissions
    let roleId = null;
    if (user.roleId) {
      roleId = user.roleId;
    } else {
      const role = await Role.findOne({ where: { name: user.role } });
      if (role) roleId = role.id;
    }

    const allResources = await Permission.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'displayName', 'description', 'category']
    });

    const rolePermissions = roleId ? await RolePermission.findAll({
      where: { roleId },
      include: [{ model: Permission }]
    }) : [];

    const userPermissions = await UserPermission.findAll({
      where: { userId: userIdNum },
      include: [{ model: Permission }]
    });

    const rolePermMap = new Map();
    rolePermissions.forEach(rp => {
      rolePermMap.set(rp.Permission.id, {
        canCreate: rp.canCreate,
        canRead: rp.canRead,
        canUpdate: rp.canUpdate,
        canDelete: rp.canDelete
      });
    });

    const userPermMap = new Map();
    userPermissions.forEach(up => {
      userPermMap.set(up.Permission.id, {
        canCreate: up.canCreate,
        canRead: up.canRead,
        canUpdate: up.canUpdate,
        canDelete: up.canDelete
      });
    });

    const permissions = allResources.map(resource => {
      const rolePerm = rolePermMap.get(resource.id);
      const userPerm = userPermMap.get(resource.id);
      const crud = userPerm || rolePerm || {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false
      };

      return {
        id: resource.id,
        name: resource.name,
        displayName: resource.displayName,
        description: resource.description,
        category: resource.category,
        canCreate: crud.canCreate,
        canRead: crud.canRead,
        canUpdate: crud.canUpdate,
        canDelete: crud.canDelete,
        source: userPerm ? 'user' : (rolePerm ? 'role' : 'none')
      };
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      permissions
    });
  } catch (error) {
    console.error('Get user CRUD permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/permissions/user/:userId/crud
 * Update CRUD permissions for a user
 */
router.post('/user/:userId/crud', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionId, canCreate, canRead, canUpdate, canDelete } = req.body;

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid userId. Must be a number.' });
    }

    if (!permissionId) {
      return res.status(400).json({ error: 'permissionId is required' });
    }

    const permissionIdNum = parseInt(permissionId);
    if (isNaN(permissionIdNum)) {
      return res.status(400).json({ error: 'Invalid permissionId. Must be a number.' });
    }

    const user = await User.findByPk(userIdNum);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permission = await Permission.findByPk(permissionIdNum);
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    const [userPermission, created] = await UserPermission.findOrCreate({
      where: {
        userId: userIdNum,
        permissionId: permissionIdNum
      },
      defaults: {
        userId: userIdNum,
        permissionId: permissionIdNum,
        canCreate: canCreate || false,
        canRead: canRead || false,
        canUpdate: canUpdate || false,
        canDelete: canDelete || false
      }
    });

    if (!created) {
      await userPermission.update({
        canCreate: canCreate !== undefined ? canCreate : userPermission.canCreate,
        canRead: canRead !== undefined ? canRead : userPermission.canRead,
        canUpdate: canUpdate !== undefined ? canUpdate : userPermission.canUpdate,
        canDelete: canDelete !== undefined ? canDelete : userPermission.canDelete
      });
    }

    res.json({
      message: 'User CRUD permissions updated successfully',
      userPermission: {
        id: userPermission.id,
        userId: userPermission.userId,
        permissionId: userPermission.permissionId,
        canCreate: userPermission.canCreate,
        canRead: userPermission.canRead,
        canUpdate: userPermission.canUpdate,
        canDelete: userPermission.canDelete
      }
    });
  } catch (error) {
    console.error('Update user CRUD permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

